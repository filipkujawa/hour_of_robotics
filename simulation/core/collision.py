"""
Collision-aware motion planning using FCL (same library as MoveIt2).

Loads the actual URDF meshes, checks the same collision pairs defined
in the SRDF, and validates/plans trajectories that avoid self-collision.
"""

import os
import math
import numpy as np
import trimesh
import fcl
from typing import Optional
from xml.etree import ElementTree


def _rotation_matrix(axis: str, angle: float) -> np.ndarray:
    """Rotation matrix around a single axis."""
    c, s = math.cos(angle), math.sin(angle)
    if axis == "x":
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    elif axis == "y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    else:  # z
        return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def _rpy_to_matrix(r: float, p: float, y: float) -> np.ndarray:
    """Convert roll-pitch-yaw to rotation matrix."""
    return _rotation_matrix("z", y) @ _rotation_matrix("y", p) @ _rotation_matrix("x", r)


def _transform_matrix(xyz: list[float], rpy: list[float]) -> np.ndarray:
    """Build a 4x4 transform from xyz + rpy."""
    T = np.eye(4)
    T[:3, :3] = _rpy_to_matrix(rpy[0], rpy[1], rpy[2])
    T[:3, 3] = xyz
    return T


def _joint_transform(axis: list[float], angle: float) -> np.ndarray:
    """Rotation about an arbitrary axis by angle (radians)."""
    ax = np.array(axis, dtype=float)
    ax = ax / np.linalg.norm(ax)
    c, s = math.cos(angle), math.sin(angle)
    x, y, z = ax
    T = np.eye(4)
    T[:3, :3] = np.array([
        [c + x*x*(1-c),   x*y*(1-c) - z*s, x*z*(1-c) + y*s],
        [y*x*(1-c) + z*s, c + y*y*(1-c),    y*z*(1-c) - x*s],
        [z*x*(1-c) - y*s, z*y*(1-c) + x*s,  c + z*z*(1-c)],
    ])
    return T


class CollisionChecker:
    """
    Loads the MARS URDF meshes and checks self-collision using FCL,
    matching the collision pairs defined in the SRDF.
    """

    # The 5 active collision pairs from the SRDF
    COLLISION_PAIRS = [
        ("base_link", "link3"),
        ("link2", "link61"),
        ("link2", "link62"),
        ("link3", "link61"),
        ("link3", "link62"),
    ]

    def __init__(self, urdf_path: str):
        self.urdf_path = urdf_path
        mesh_dir = os.path.join(os.path.dirname(urdf_path), "meshes")

        # Parse URDF for joint/link structure
        tree = ElementTree.parse(urdf_path)
        root = tree.getroot()

        # Store joint info: parent, child, origin, axis
        self.joints: dict[str, dict] = {}
        for joint_el in root.findall("joint"):
            name = joint_el.get("name", "")
            jtype = joint_el.get("type", "fixed")
            parent = joint_el.find("parent").get("link", "")
            child = joint_el.find("child").get("link", "")
            origin_el = joint_el.find("origin")
            xyz = [float(v) for v in (origin_el.get("xyz", "0 0 0")).split()]
            rpy = [float(v) for v in (origin_el.get("rpy", "0 0 0")).split()]
            axis_el = joint_el.find("axis")
            axis = [float(v) for v in axis_el.get("xyz", "0 0 1").split()] if axis_el is not None else [0, 0, 1]

            self.joints[name] = {
                "type": jtype,
                "parent": parent,
                "child": child,
                "xyz": xyz,
                "rpy": rpy,
                "axis": axis,
            }

        # Load meshes for collision-checked links
        collision_links = set()
        for a, b in self.COLLISION_PAIRS:
            collision_links.add(a)
            collision_links.add(b)

        self.meshes: dict[str, trimesh.Trimesh] = {}
        self.fcl_models: dict[str, fcl.BVHModel] = {}
        self.visual_origins: dict[str, np.ndarray] = {}

        for link_el in root.findall("link"):
            link_name = link_el.get("name", "")
            if link_name not in collision_links:
                continue

            visual = link_el.find("visual")
            if visual is None:
                continue

            # Visual origin transform
            vis_origin = visual.find("origin")
            if vis_origin is not None:
                vxyz = [float(v) for v in vis_origin.get("xyz", "0 0 0").split()]
                vrpy = [float(v) for v in vis_origin.get("rpy", "0 0 0").split()]
                self.visual_origins[link_name] = _transform_matrix(vxyz, vrpy)
            else:
                self.visual_origins[link_name] = np.eye(4)

            geom = visual.find("geometry")
            mesh_el = geom.find("mesh") if geom is not None else None

            if mesh_el is not None:
                filename = mesh_el.get("filename", "")
                # Handle relative paths
                if filename.startswith("meshes/"):
                    filepath = os.path.join(os.path.dirname(urdf_path), filename)
                else:
                    filepath = os.path.join(mesh_dir, filename)

                if os.path.exists(filepath):
                    mesh = trimesh.load_mesh(filepath)
                    self.meshes[link_name] = mesh

                    model = fcl.BVHModel()
                    verts = np.array(mesh.vertices, dtype=np.float64)
                    faces = np.array(mesh.faces, dtype=np.int32)
                    model.beginModel(len(verts), len(faces))
                    model.addSubModel(verts, faces)
                    model.endModel()
                    self.fcl_models[link_name] = model

        # Build kinematic chain: for each link, which joint gets us there
        self._link_to_joint: dict[str, str] = {}
        self._kinematic_chain: dict[str, list[str]] = {}
        for jname, jinfo in self.joints.items():
            self._link_to_joint[jinfo["child"]] = jname

        # Joint ordering for the arm
        self.arm_joints = ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"]

    def _compute_link_transform(self, link_name: str, joint_values: dict[str, float]) -> np.ndarray:
        """Compute the world-frame transform of a link given joint values."""
        # Walk from base_link to the target link
        chain = []
        current = link_name
        while current != "base_link" and current in self._link_to_joint:
            jname = self._link_to_joint[current]
            chain.append(jname)
            current = self.joints[jname]["parent"]

        chain.reverse()

        T = np.eye(4)
        for jname in chain:
            jinfo = self.joints[jname]
            # Joint origin transform
            T = T @ _transform_matrix(jinfo["xyz"], jinfo["rpy"])
            # Joint rotation (if revolute)
            if jinfo["type"] == "revolute":
                angle = joint_values.get(jname, 0.0)
                T = T @ _joint_transform(jinfo["axis"], angle)

        return T

    def check_collision(self, joint_values: dict[str, float]) -> bool:
        """Check if a joint configuration causes self-collision.
        Returns True if there IS a collision."""
        req = fcl.CollisionRequest()

        for link_a, link_b in self.COLLISION_PAIRS:
            if link_a not in self.fcl_models or link_b not in self.fcl_models:
                continue

            # Compute world-frame transforms
            T_a = self._compute_link_transform(link_a, joint_values)
            T_a = T_a @ self.visual_origins.get(link_a, np.eye(4))

            T_b = self._compute_link_transform(link_b, joint_values)
            T_b = T_b @ self.visual_origins.get(link_b, np.eye(4))

            obj_a = fcl.CollisionObject(
                self.fcl_models[link_a],
                fcl.Transform(T_a[:3, :3], T_a[:3, 3])
            )
            obj_b = fcl.CollisionObject(
                self.fcl_models[link_b],
                fcl.Transform(T_b[:3, :3], T_b[:3, 3])
            )

            res = fcl.CollisionResult()
            fcl.collide(obj_a, obj_b, req, res)
            if res.is_collision:
                return True

        return False

    # Joint limits from the URDF (radians)
    JOINT_LIMITS = {
        "joint1": (-1.5708, 1.5708),
        "joint2": (-1.5708, 1.22),
        "joint3": (-1.5708, 1.7453),
        "joint4": (-1.9199, 1.7453),
        "joint5": (-1.5708, 1.5708),
        "joint6": (-0.8727, 0.3491),
    }

    # Max joint velocity (rad/s) — matches the URDF velocity limits
    MAX_JOINT_VEL = 2.0

    def _config_to_array(self, config: dict[str, float]) -> np.ndarray:
        return np.array([config.get(j, 0.0) for j in self.arm_joints])

    def _array_to_config(self, arr: np.ndarray) -> dict[str, float]:
        return {j: float(arr[i]) for i, j in enumerate(self.arm_joints)}

    def _random_config(self) -> np.ndarray:
        """Sample a random joint configuration within limits."""
        cfg = np.zeros(6)
        for i, jname in enumerate(self.arm_joints):
            lo, hi = self.JOINT_LIMITS[jname]
            cfg[i] = np.random.uniform(lo, hi)
        return cfg

    def _clamp_config(self, cfg: np.ndarray) -> np.ndarray:
        """Clamp joints to their limits."""
        for i, jname in enumerate(self.arm_joints):
            lo, hi = self.JOINT_LIMITS[jname]
            cfg[i] = np.clip(cfg[i], lo, hi)
        return cfg

    def _distance(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.linalg.norm(a - b))

    def _steer(self, from_cfg: np.ndarray, to_cfg: np.ndarray, max_step: float = 0.15) -> np.ndarray:
        """Move from from_cfg toward to_cfg by at most max_step."""
        diff = to_cfg - from_cfg
        dist = np.linalg.norm(diff)
        if dist <= max_step:
            return to_cfg.copy()
        return from_cfg + diff * (max_step / dist)

    def _check_edge(self, a: np.ndarray, b: np.ndarray, resolution: float = 0.05) -> bool:
        """Check if the straight-line path from a to b is collision-free.
        Returns True if the path is FREE (no collision)."""
        dist = self._distance(a, b)
        steps = max(2, int(dist / resolution) + 1)
        for i in range(steps + 1):
            t = i / steps
            cfg = a + (b - a) * t
            if self.check_collision(self._array_to_config(cfg)):
                return False
        return True

    def plan_collision_free(
        self,
        start_joints: dict[str, float],
        target_joints: dict[str, float],
        num_waypoints: int = 20,
    ) -> list[dict[str, float]]:
        """
        Plan a collision-free trajectory using RRTConnect (same algorithm as MoveIt2).
        Falls back to direct interpolation if the straight path is already free.
        Applies path shortcutting and smoothing after planning.
        """
        start = self._config_to_array(start_joints)
        goal = self._config_to_array(target_joints)

        # Check if start or goal are in collision
        if self.check_collision(start_joints):
            # Start is in collision — can't plan, just return direct path
            return self._interpolate_path(start, goal, num_waypoints)

        if self.check_collision(target_joints):
            # Goal is in collision — can't reach, return start repeated
            return [start_joints] * (num_waypoints + 1)

        # Try direct path first (most common case)
        if self._check_edge(start, goal):
            return self._interpolate_path(start, goal, num_waypoints)

        # Run RRTConnect
        path = self._rrt_connect(start, goal)

        if path is None:
            # RRT failed — fall back to direct path (may have collisions)
            return self._interpolate_path(start, goal, num_waypoints)

        # Shortcut the path (remove unnecessary waypoints)
        path = self._shortcut_path(path)

        # Resample to requested number of waypoints
        return self._resample_path(path, num_waypoints)

    def _rrt_connect(
        self,
        start: np.ndarray,
        goal: np.ndarray,
        max_iter: int = 2000,
        step_size: float = 0.15,
    ) -> Optional[list[np.ndarray]]:
        """
        RRTConnect: Bidirectional RRT (Kuffner & LaValle, 2000).
        Same algorithm MoveIt2 uses as its default planner.
        """
        # Tree A grows from start, Tree B grows from goal
        tree_a_nodes = [start.copy()]
        tree_a_parent = [-1]
        tree_b_nodes = [goal.copy()]
        tree_b_parent = [-1]

        def nearest(tree_nodes: list[np.ndarray], target: np.ndarray) -> int:
            dists = [self._distance(n, target) for n in tree_nodes]
            return int(np.argmin(dists))

        def extend(
            tree_nodes: list[np.ndarray],
            tree_parent: list[int],
            target: np.ndarray,
        ) -> tuple[str, int]:
            """Extend tree toward target. Returns (status, node_idx)."""
            near_idx = nearest(tree_nodes, target)
            near_cfg = tree_nodes[near_idx]
            new_cfg = self._steer(near_cfg, target, step_size)
            new_cfg = self._clamp_config(new_cfg)

            if self._check_edge(near_cfg, new_cfg):
                tree_nodes.append(new_cfg)
                tree_parent.append(near_idx)
                new_idx = len(tree_nodes) - 1
                if self._distance(new_cfg, target) < 1e-3:
                    return "reached", new_idx
                return "advanced", new_idx
            return "trapped", near_idx

        def connect(
            tree_nodes: list[np.ndarray],
            tree_parent: list[int],
            target: np.ndarray,
        ) -> tuple[str, int]:
            """Repeatedly extend toward target until reached or trapped."""
            status = "advanced"
            idx = -1
            while status == "advanced":
                status, idx = extend(tree_nodes, tree_parent, target)
            return status, idx

        def extract_path(tree_nodes: list[np.ndarray], tree_parent: list[int], idx: int) -> list[np.ndarray]:
            path = []
            while idx != -1:
                path.append(tree_nodes[idx])
                idx = tree_parent[idx]
            path.reverse()
            return path

        swap = False
        for _ in range(max_iter):
            # Sample random config (with 5% goal bias)
            if np.random.random() < 0.05:
                q_rand = goal if not swap else start
            else:
                q_rand = self._random_config()

            if not swap:
                status_a, idx_a = extend(tree_a_nodes, tree_a_parent, q_rand)
                if status_a != "trapped":
                    q_new = tree_a_nodes[idx_a]
                    status_b, idx_b = connect(tree_b_nodes, tree_b_parent, q_new)
                    if status_b == "reached":
                        # Trees connected — build path
                        path_a = extract_path(tree_a_nodes, tree_a_parent, idx_a)
                        path_b = extract_path(tree_b_nodes, tree_b_parent, idx_b)
                        path_b.reverse()
                        return path_a + path_b
            else:
                status_b, idx_b = extend(tree_b_nodes, tree_b_parent, q_rand)
                if status_b != "trapped":
                    q_new = tree_b_nodes[idx_b]
                    status_a, idx_a = connect(tree_a_nodes, tree_a_parent, q_new)
                    if status_a == "reached":
                        path_a = extract_path(tree_a_nodes, tree_a_parent, idx_a)
                        path_b = extract_path(tree_b_nodes, tree_b_parent, idx_b)
                        path_b.reverse()
                        return path_a + path_b

            swap = not swap

        return None  # Planning failed

    def _shortcut_path(self, path: list[np.ndarray], max_iter: int = 50) -> list[np.ndarray]:
        """
        Path shortcutting — randomly try to connect non-adjacent waypoints
        directly, removing unnecessary detours. Same post-processing MoveIt2 applies.
        """
        if len(path) <= 2:
            return path

        path = list(path)  # copy
        for _ in range(max_iter):
            if len(path) <= 2:
                break
            i = np.random.randint(0, len(path) - 2)
            j = np.random.randint(i + 2, len(path))
            if self._check_edge(path[i], path[j]):
                # Direct connection is collision-free — remove intermediate waypoints
                path = path[:i+1] + path[j:]

        return path

    def _interpolate_path(
        self, start: np.ndarray, goal: np.ndarray, num_points: int
    ) -> list[dict[str, float]]:
        """Simple linear interpolation between two configs."""
        result = []
        for i in range(num_points + 1):
            t = i / num_points
            cfg = start + (goal - start) * t
            result.append(self._array_to_config(cfg))
        return result

    def _resample_path(
        self, path: list[np.ndarray], num_points: int
    ) -> list[dict[str, float]]:
        """Resample a variable-length path to a fixed number of evenly-spaced waypoints."""
        if len(path) <= 1:
            cfg = self._array_to_config(path[0] if path else np.zeros(6))
            return [cfg] * (num_points + 1)

        # Compute cumulative arc length
        lengths = [0.0]
        for i in range(1, len(path)):
            lengths.append(lengths[-1] + self._distance(path[i-1], path[i]))
        total = lengths[-1]

        if total < 1e-6:
            return [self._array_to_config(path[0])] * (num_points + 1)

        result = []
        for i in range(num_points + 1):
            target_len = (i / num_points) * total
            # Find the segment
            for seg in range(len(lengths) - 1):
                if lengths[seg + 1] >= target_len:
                    seg_len = lengths[seg + 1] - lengths[seg]
                    if seg_len < 1e-6:
                        t = 0.0
                    else:
                        t = (target_len - lengths[seg]) / seg_len
                    cfg = path[seg] + (path[seg + 1] - path[seg]) * t
                    result.append(self._array_to_config(cfg))
                    break
            else:
                result.append(self._array_to_config(path[-1]))

        return result
