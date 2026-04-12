import rerun as rr
import rerun.blueprint as rrb
from rerun.urdf import UrdfTree
import uuid
import time
import os
import socket
import math
import numpy as np
import ikpy.chain
from typing import Optional
from simulation.core.collision import CollisionChecker, _transform_matrix, _joint_transform

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
        self.cube_asset_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "models",
            "assets",
            "cube.gltf"
        )
        
        # Initialize URDF tree
        self.urdf_tree = UrdfTree.from_file_path(self.urdf_path, entity_path_prefix="robot", frame_prefix="tf#robot/")

        # IK chain from the same URDF (base_link → ee_link)
        self.ik_chain = ikpy.chain.Chain.from_urdf_file(
            self.urdf_path,
            base_elements=["base_link"],
            last_link_vector=[0.091838, 0, 0],
            active_links_mask=[False, True, True, True, True, True, True, False],
            name="arm"
        )

        # Collision checker using FCL with actual STL meshes (same as MoveIt2)
        self.collision = CollisionChecker(self.urdf_path)

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

    # Joint limits for clamping IK seeds
    _IK_LIMITS = [
        None,  # index 0: base link (fixed)
        (-1.5708, 1.5708),   # joint1
        (-1.5708, 1.22),     # joint2
        (-1.5708, 1.7453),   # joint3
        (-1.9199, 1.7453),   # joint4
        (-1.5708, 1.5708),   # joint5
        (-0.8727, 0.3491),   # joint6
        None,  # index 7: ee link (fixed)
    ]

    def _clamp_seed(self, seed: list[float]) -> list[float]:
        """Clamp an IK seed to joint limits so ikpy doesn't crash."""
        clamped = list(seed)
        for i, lim in enumerate(self._IK_LIMITS):
            if lim is not None:
                clamped[i] = max(lim[0], min(lim[1], clamped[i]))
        return clamped

    def solve_ik(self, x: float, y: float, z: float) -> dict[str, float]:
        """Solve IK for a target XYZ position (meters).

        Tries multiple seeds and picks the collision-free solution
        closest to the current joint configuration (minimal joint movement),
        matching how MoveIt2 selects IK solutions.
        """
        target = [x, y, z]

        # Build current config for the chain (8 elements: base + 6 joints + ee)
        current = [0.0] * 8
        for i, jname in enumerate(["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"]):
            current[i + 1] = self.current_joints.get(jname, 0.0)
        current = self._clamp_seed(current)

        # Compute the geometrically correct base rotation for j1
        j1_hint = math.atan2(y, x) if abs(x) > 0.001 or abs(y) > 0.001 else current[1]

        # Try multiple seeds: current config, j1-hinted, and perturbations
        seeds = [current]

        hinted = list(current)
        hinted[1] = j1_hint
        seeds.append(self._clamp_seed(hinted))

        for j2_off in [0.0, -0.3, 0.3, -0.6, 0.6]:
            for j3_off in [0.0, 0.3, -0.3, 0.6]:
                seed = list(current)
                seed[1] = j1_hint
                seed[2] = current[2] + j2_off
                seed[3] = current[3] + j3_off
                seeds.append(self._clamp_seed(seed))

        # Solve IK with each seed, collect valid solutions
        candidates = []
        current_arr = np.array(current[1:7])

        for seed in seeds:
            try:
                ik_result = self.ik_chain.inverse_kinematics(target, initial_position=seed)
                joints = {f"joint{i+1}": float(ik_result[i+1]) for i in range(6)}

                if self.collision.check_collision(joints):
                    continue

                result_arr = np.array([joints[f"joint{i+1}"] for i in range(6)])
                dist = float(np.linalg.norm(result_arr - current_arr))
                candidates.append((dist, joints))
            except Exception:
                continue

        if candidates:
            candidates.sort(key=lambda x: x[0])
            return candidates[0][1]

        # Fallback with a safe zero seed
        safe_seed = self._clamp_seed([0.0] * 8)
        ik_result = self.ik_chain.inverse_kinematics(target, initial_position=safe_seed)
        return {f"joint{i+1}": float(ik_result[i+1]) for i in range(6)}

    def animate_joints(self, target_joints: dict[str, float], start_time: float, duration: float = 1.0):
        """Interpolates joints from current to target over duration, avoiding collisions."""
        start_joints = {k: v for k, v in self.current_joints.items()}

        # Plan a collision-free trajectory using FCL
        trajectory = self.collision.plan_collision_free(
            start_joints, target_joints, num_waypoints=20
        )

        fps = 30
        num_steps = max(1, int(duration * fps))

        for i in range(1, num_steps + 1):
            t = i / num_steps
            smooth_t = t * t * (3 - 2 * t)
            curr_time = start_time + t * duration
            self.rec.set_time("sim_time", duration=curr_time)

            # Map the smooth_t to a waypoint in the trajectory
            traj_idx = min(int(smooth_t * (len(trajectory) - 1)), len(trajectory) - 1)
            waypoint = trajectory[traj_idx]

            for name, target_val in target_joints.items():
                val = waypoint.get(name, start_joints.get(name, 0.0))
                self.set_joint_position(name, val, log=True)

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
        self.log_scene_assets()
        
        self.reset_state()

    def log_scene_assets(self):
        """Logs static props that should always appear in the scene."""
        if not os.path.exists(self.cube_asset_path):
            return

        self.rec.log(
            "props/cube",
            rr.Transform3D(
                translation=[0.35, 0.0, 0.02],
                parent_frame="tf#/",
                child_frame="tf#/props/cube"
            ),
            static=True
        )
        self.rec.log(
            "props/cube",
            rr.Asset3D(path=self.cube_asset_path),
            static=True
        )

    # Known object positions in world frame (meters)
    CUBE_POSITION = np.array([0.35, 0.0, 0.02])

    # Camera mounting from URDF (relative to parent link)
    # Head camera left: parent=head, xyz=[0.04327, 0.0297, -0.000275], rpy=[0,0,0]
    # Arm camera: parent=link5, xyz=[0.03378, 0, 0.05052], rpy=[0, 0.43633, 0]
    _HEAD_CAM_OFFSET = _transform_matrix([0.04327, 0.0297, -0.000275], [0, 0, 0])
    _ARM_CAM_OFFSET = _transform_matrix([0.03378, 0, 0.05052], [0, 0.43633, 0])
    # Optical frame: Z forward, X right, Y down
    _OPTICAL_FRAME = _transform_matrix([0, 0, 0], [-math.pi/2, 0, -math.pi/2])

    def _compute_link_transform(self, link_name: str) -> np.ndarray:
        """Compute world-frame 4x4 transform for a link using current joint state."""
        # Use the collision checker's FK (it parses the URDF joint chain)
        return self.collision._compute_link_transform(link_name, self.current_joints)

    def _get_robot_base_transform(self) -> np.ndarray:
        """Get the robot base transform including position and heading."""
        T = np.eye(4)
        c, s = math.cos(self.heading), math.sin(self.heading)
        T[:3, :3] = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        T[0, 3] = self.pos_x
        T[1, 3] = self.pos_y
        return T

    def get_tag_in_camera_frame(self, camera: str = "HEAD") -> dict[str, float]:
        """
        Compute the cube's position relative to the robot base frame.
        Returns {"x": ..., "y": ..., "z": ...} in base_link coordinates.

        This matches what the real robot's ArUco pipeline outputs after
        TF transforms the detection from camera frame to base_link frame:
        - x: forward from robot center (meters)
        - y: left from robot center (meters)
        - z: up from ground (meters)
        """
        # World position of the cube
        cube_world = np.array([*self.CUBE_POSITION, 1.0])

        # Transform cube into robot base frame
        T_base = self._get_robot_base_transform()
        T_base_inv = np.linalg.inv(T_base)
        cube_base = T_base_inv @ cube_world

        return {
            "x": round(float(cube_base[0]), 4),
            "y": round(float(cube_base[1]), 4),
            "z": round(float(cube_base[2]), 4),
        }

    def is_tag_visible(self, camera: str = "HEAD") -> bool:
        """Check if the cube is within detectable range (< 1 meter)."""
        tag = self.get_tag_in_camera_frame(camera)
        dist = math.sqrt(tag["x"]**2 + tag["y"]**2 + tag["z"]**2)
        # Visible if the cube is in front of the robot and within 1 meter
        return tag["x"] > 0 and dist < 1.0

    # Real home joint positions from the robot
    HOME_JOINTS = {
        "joint1": 1.5876701154616386,
        "joint2": -1.5968740001889525,
        "joint3": 1.6152817696435802,
        "joint4": 0.8927768185494431,
        "joint5": -0.035281558121369745,
        "joint6": 0.010737865515199488,
    }

    def reset_state(self):
        """Resets the internal robot state, starting at the real home position."""
        self.pos_x = 0.0
        self.pos_y = 0.0
        self.heading = 0.0
        self.trail_positions = [[0.0, 0.0, 0.0]]
        self.waypoints = [[0.0, 0.0, 0.0]]

        self.rec.set_time("sim_time", duration=0)

        # Set arm to real home position
        for jname, val in self.HOME_JOINTS.items():
            self.set_joint_position(jname, val, log=True)

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
