import rerun as rr
import rerun.blueprint as rrb
from rerun.urdf import UrdfTree
import uuid
import time
import os
import socket
import math
from typing import Optional

def find_free_port():
    """Finds a free port on the local machine."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

class MarsSimulator:
    """
    Simulates the Mars robot by logging 3D data to Rerun using a URDF model.
    Each instance represents a unique user session with its own RecordingStream.
    """

    def __init__(self, session_id: str):
        self.session_id = session_id

        # Create a dedicated recording stream for this session
        self.rec = rr.RecordingStream(application_id=f"mars_sim_{session_id}")

        # Manually pick a free port because serve_grpc(grpc_port=0) returns ':0' literally
        # which the browser cannot connect to.
        free_port = find_free_port()
        self.server_uri = self.rec.serve_grpc(grpc_port=free_port)

        # Current robot state for accumulation
        self.pos_x = 0.0
        self.pos_y = 0.0
        self.heading = 0.0 # radians
        
        # Trail of points to show movement
        self.trail_positions = []
        
        # Get path to URDF model
        self.urdf_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "models", 
            "mars_robot.urdf"
        )
        
        # Initialize URDF tree
        self.urdf_tree = UrdfTree.from_file_path(self.urdf_path, entity_path_prefix="robot", frame_prefix="tf#robot/")

    def setup_robot_model(self):
        """Initializes the robot model and blueprint."""
        # Define a clean layout
        blueprint = rrb.Blueprint(
            rrb.Spatial3DView(
                origin="/", 
                name="Mars Simulation",
                # Explicitly set target frame to root using "tf#/"
                spatial_information=rrb.SpatialInformation(
                    target_frame="tf#/"
                )
            ),
            rrb.TimePanel(
                timeline="sim_time", 
                play_state="playing", 
                state="expanded",
                loop_mode="All"
            ),
            collapse_panels=True,
            auto_views=False
        )
        self.rec.send_blueprint(blueprint)

        # Log world orientation (ROS style: RHS, Z up)
        self.rec.log("/", rr.ViewCoordinates.RIGHT_HAND_Z_UP, static=True)

        # Log a fixed origin marker
        self.rec.log("origin", rr.Arrows3D(origins=[[0,0,0]], vectors=[[1,0,0], [0,1,0], [0,0,1]], colors=[[255,0,0], [0,255,0], [0,0,255]]), static=True)

        # Log the URDF structure
        self.urdf_tree.log_urdf_to_recording(self.rec)
        
        self.reset_state()

    def reset_state(self):
        """Resets the internal robot state."""
        self.pos_x = 0.0
        self.pos_y = 0.0
        self.heading = 0.0
        self.trail_positions = [[0.0, 0.0, 0.0]]
        
        self.rec.set_time("sim_time", duration=0)
        self.log_current_state()

    def log_current_state(self):
        """Logs the robot's current position and orientation to Rerun."""
        # 1. Log the main robot transform
        self.rec.log(
            "robot",
            rr.Transform3D(
                translation=[self.pos_x, self.pos_y, 0],
                rotation=rr.RotationAxisAngle(axis=[0, 0, 1], radians=self.heading),
                parent_frame="tf#/",
                child_frame="tf#robot/base_link"
            )
        )
        
        # 2. Log the trail
        self.trail_positions.append([self.pos_x, self.pos_y, 0.0])
        self.rec.log(
            "trail",
            rr.Points3D(self.trail_positions, colors=[217, 119, 6], radii=0.05)
        )

    def move_forward(self, steps: float, start_time: float, duration: float = 1.0):
        """Simulates moving forward with interpolation for smoothness."""
        distance = steps * 1.0
        start_x, start_y = self.pos_x, self.pos_y
        target_x = start_x + distance * math.cos(self.heading)
        target_y = start_y + distance * math.sin(self.heading)
        
        fps = 15
        num_steps = max(1, int(duration * fps))
        for i in range(1, num_steps + 1):
            t = i / num_steps
            self.pos_x = start_x + (target_x - start_x) * t
            self.pos_y = start_y + (target_y - start_y) * t
            self.rec.set_time("sim_time", duration=start_time + t * duration)
            self.log_current_state()

    def turn(self, direction: str, degrees: float, start_time: float, duration: float = 0.5):
        """Simulates turning with interpolation for smoothness."""
        start_heading = self.heading
        rads = math.radians(degrees)
        target_heading = start_heading + (rads if direction == "LEFT" else -rads)
        
        fps = 15
        num_steps = max(1, int(duration * fps))
        for i in range(1, num_steps + 1):
            t = i / num_steps
            self.heading = start_heading + (target_heading - start_heading) * t
            self.rec.set_time("sim_time", duration=start_time + t * duration)
            self.log_current_state()

    def say(self, text: str, timestamp: float):
        """Simulates speaking."""
        self.rec.set_time("sim_time", duration=timestamp)
        self.rec.log("robot/speech", rr.TextLog(text))

    def get_viewer_url(self) -> str:
        """Returns the gRPC URL for the Rerun web viewer to connect to."""
        return str(self.server_uri)
