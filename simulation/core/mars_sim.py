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
        
        # Trail: line segments + waypoint dots
        self.trail_positions = []
        self.waypoints = []
        
        # Get path to URDF model
        self.urdf_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "models", 
            "mars_robot.urdf"
        )
        
        # Initialize URDF tree
        self.urdf_tree = UrdfTree.from_file_path(self.urdf_path, entity_path_prefix="robot", frame_prefix="tf#robot/")
        
        # Track joint positions
        self.current_joints = {j.name: 0.0 for j in self.urdf_tree.joints()}

    def get_entity_path_for_link(self, link_name: str) -> str:
        """Helper to find the entity path for a given link name."""
        # UrdfTree organizes entities in a hierarchy matching the URDF
        # We can find it by looking at the visual geometry paths
        paths = self.urdf_tree.get_visual_geometry_paths(link_name)
        if paths:
            # Visual paths look like "robot/base_link/link1/visual_0"
            # We want "robot/base_link/link1"
            return "/".join(paths[0].split("/")[:-1])
        
        # Fallback to a guess if no visuals (shouldn't happen for most links in this URDF)
        return f"robot/{link_name}"

    def set_joint_position(self, joint_name: str, value: float, log: bool = True):
        """Sets a joint position and optionally logs the transform to Rerun."""
        joint = self.urdf_tree.get_joint_by_name(joint_name)
        if joint:
            self.current_joints[joint_name] = value
            if log:
                transform = joint.compute_transform(value)
                entity_path = self.get_entity_path_for_link(joint.child_link)
                self.rec.log(entity_path, transform)

    def animate_joints(self, target_joints: dict[str, float], start_time: float, duration: float = 1.0):
        """Interpolates joints from current to target over duration."""
        start_joints = self.current_joints.copy()
        fps = 30
        num_steps = max(1, int(duration * fps))
        
        for i in range(1, num_steps + 1):
            t = i / num_steps
            # Use smoothstep for more natural movement
            smooth_t = t * t * (3 - 2 * t)
            curr_time = start_time + t * duration
            self.rec.set_time("sim_time", duration=curr_time)
            
            for name, target_val in target_joints.items():
                start_val = start_joints.get(name, 0.0)
                interp_val = start_val + (target_val - start_val) * smooth_t
                self.set_joint_position(name, interp_val, log=True)

    def setup_robot_model(self):
        """Initializes the robot model and blueprint."""
        # Clean, minimal layout for educational use
        blueprint = rrb.Blueprint(
            rrb.Spatial3DView(
                origin="/",
                name="Mars Simulation",
                background=[24, 24, 27],
                spatial_information=rrb.SpatialInformation(
                    target_frame="tf#/"
                ),
                line_grid=rrb.LineGrid3D(
                    visible=True,
                    spacing=0.15,
                    color=[255, 255, 255, 25],
                    stroke_width=0.5,
                ),
            ),
            rrb.TimePanel(
                timeline="sim_time",
                play_state="playing",
                state="collapsed",
                loop_mode="All"
            ),
            collapse_panels=True,
            auto_views=False
        )
        self.rec.send_blueprint(blueprint)

        # Log world orientation (ROS style: RHS, Z up)
        self.rec.log("/", rr.ViewCoordinates.RIGHT_HAND_Z_UP, static=True)

        # Log the URDF structure
        self.urdf_tree.log_urdf_to_recording(self.rec)
        
        self.reset_state()

    def reset_state(self):
        """Resets the internal robot state."""
        self.pos_x = 0.0
        self.pos_y = 0.0
        self.heading = 0.0
        self.trail_positions = [[0.0, 0.0, 0.0]]
        self.waypoints = [[0.0, 0.0, 0.0]]

        self.rec.set_time("sim_time", duration=0)
        self.log_current_state()

    def add_waypoint(self):
        """Mark the current position as a waypoint (shown as a dot)."""
        self.waypoints.append([self.pos_x, self.pos_y, 0.01])

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

        # 2. Log the trail as a thin blue line
        self.trail_positions.append([self.pos_x, self.pos_y, 0.005])
        if len(self.trail_positions) >= 2:
            self.rec.log(
                "trail/path",
                rr.LineStrips3D(
                    [self.trail_positions],
                    colors=[[99, 160, 255, 160]],
                    radii=0.006
                )
            )

        # 3. Log waypoints as small blue dots at movement boundaries
        if self.waypoints:
            self.rec.log(
                "trail/waypoints",
                rr.Points3D(
                    self.waypoints,
                    colors=[99, 160, 255],
                    radii=0.015
                )
            )

    def move_forward(self, steps: float, start_time: float, duration: float = 1.0):
        """Simulates moving forward with interpolation for smoothness."""
        self.add_waypoint()
        distance = steps * 0.25
        start_x, start_y = self.pos_x, self.pos_y
        target_x = start_x + distance * math.cos(self.heading)
        target_y = start_y + distance * math.sin(self.heading)

        fps = 30
        num_steps = max(1, int(duration * fps))
        for i in range(1, num_steps + 1):
            t = i / num_steps
            smooth_t = t * t * (3 - 2 * t)
            self.pos_x = start_x + (target_x - start_x) * smooth_t
            self.pos_y = start_y + (target_y - start_y) * smooth_t
            self.rec.set_time("sim_time", duration=start_time + t * duration)
            self.log_current_state()
        self.add_waypoint()

    def turn(self, direction: str, degrees: float, start_time: float, duration: float = 0.5):
        """Simulates turning with interpolation for smoothness."""
        self.add_waypoint()
        start_heading = self.heading
        rads = math.radians(degrees)
        target_heading = start_heading + (rads if direction == "LEFT" else -rads)

        fps = 30
        num_steps = max(1, int(duration * fps))
        for i in range(1, num_steps + 1):
            t = i / num_steps
            smooth_t = t * t * (3 - 2 * t)
            self.heading = start_heading + (target_heading - start_heading) * smooth_t
            self.rec.set_time("sim_time", duration=start_time + t * duration)
            self.log_current_state()
        self.add_waypoint()

    def say(self, text: str, timestamp: float):
        """Simulates speaking."""
        self.rec.set_time("sim_time", duration=timestamp)
        self.rec.log("robot/speech", rr.TextLog(text))

    def get_viewer_url(self) -> str:
        """Returns the gRPC URL for the Rerun web viewer to connect to."""
        return str(self.server_uri)
