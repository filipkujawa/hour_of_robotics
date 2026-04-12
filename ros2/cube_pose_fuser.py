#!/usr/bin/env python3

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from std_msgs.msg import Bool, String
from aruco_markers_msgs.msg import MarkerArray
import json
import os


def _quat_to_matrix(qx: float, qy: float, qz: float, qw: float) -> List[List[float]]:
    # Standard quaternion to rotation matrix
    xx = qx * qx
    yy = qy * qy
    zz = qz * qz
    xy = qx * qy
    xz = qx * qz
    yz = qy * qz
    wx = qw * qx
    wy = qw * qy
    wz = qw * qz

    return [
        [1.0 - 2.0 * (yy + zz), 2.0 * (xy - wz), 2.0 * (xz + wy)],
        [2.0 * (xy + wz), 1.0 - 2.0 * (xx + zz), 2.0 * (yz - wx)],
        [2.0 * (xz - wy), 2.0 * (yz + wx), 1.0 - 2.0 * (xx + yy)],
    ]


def _rotate_z_axis(qx: float, qy: float, qz: float, qw: float) -> List[float]:
    # Rotate the tag's +Z axis into camera frame.
    m = _quat_to_matrix(qx, qy, qz, qw)
    return [m[0][2], m[1][2], m[2][2]]

def _normalize(v: List[float]) -> List[float]:
    n = math.sqrt(sum(x * x for x in v))
    if n < 1e-9:
        return [0.0, 0.0, 0.0]
    return [x / n for x in v]

def _dot(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))

def _cross(a: List[float], b: List[float]) -> List[float]:
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]

def _matrix_to_quat(m: List[List[float]]) -> List[float]:
    # Convert rotation matrix to quaternion (x, y, z, w)
    trace = m[0][0] + m[1][1] + m[2][2]
    if trace > 0.0:
        s = math.sqrt(trace + 1.0) * 2.0
        qw = 0.25 * s
        qx = (m[2][1] - m[1][2]) / s
        qy = (m[0][2] - m[2][0]) / s
        qz = (m[1][0] - m[0][1]) / s
    elif (m[0][0] > m[1][1]) and (m[0][0] > m[2][2]):
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2.0
        qw = (m[2][1] - m[1][2]) / s
        qx = 0.25 * s
        qy = (m[0][1] + m[1][0]) / s
        qz = (m[0][2] + m[2][0]) / s
    elif m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2.0
        qw = (m[0][2] - m[2][0]) / s
        qx = (m[0][1] + m[1][0]) / s
        qy = 0.25 * s
        qz = (m[1][2] + m[2][1]) / s
    else:
        s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2.0
        qw = (m[1][0] - m[0][1]) / s
        qx = (m[0][2] + m[2][0]) / s
        qy = (m[1][2] + m[2][1]) / s
        qz = 0.25 * s
    return [qx, qy, qz, qw]


def _avg_quaternions(quats: List[List[float]]) -> List[float]:
    if not quats:
        return [0.0, 0.0, 0.0, 1.0]
    ref = quats[0]
    acc = [0.0, 0.0, 0.0, 0.0]
    for q in quats:
        dot = sum(a * b for a, b in zip(ref, q))
        if dot < 0.0:
            q = [-q[0], -q[1], -q[2], -q[3]]
        acc[0] += q[0]
        acc[1] += q[1]
        acc[2] += q[2]
        acc[3] += q[3]
    norm = math.sqrt(sum(a * a for a in acc))
    if norm < 1e-9:
        return [0.0, 0.0, 0.0, 1.0]
    return [acc[0] / norm, acc[1] / norm, acc[2] / norm, acc[3] / norm]


class CubePoseFuser(Node):
    def __init__(self) -> None:
        super().__init__("cube_pose_fuser")
        self.declare_parameter("input_topic", "/aruco/markers")
        self.declare_parameter("output_topic", "/aruco/cube_pose")
        self.declare_parameter("faces_topic", "/aruco/cube_faces")
        self.declare_parameter("detected_topic", "/aruco/detected")
        self.declare_parameter("detected_rate_hz", 10.0)
        self.declare_parameter("detection_hold_sec", 0.5)
        self.declare_parameter("cube_size_m", 0.04)
        self.declare_parameter("tag_ids", [0, 1, 2, 3, 4, 5])
        self.declare_parameter("config_path", "")

        input_topic = self.get_parameter("input_topic").value
        self.output_topic = self.get_parameter("output_topic").value
        self.faces_topic = self.get_parameter("faces_topic").value
        self.detected_topic = self.get_parameter("detected_topic").value
        self.detected_rate_hz = float(self.get_parameter("detected_rate_hz").value)
        self.detection_hold_sec = max(0.0, float(self.get_parameter("detection_hold_sec").value))
        self.cube_size_m = float(self.get_parameter("cube_size_m").value)
        self.tag_ids = set(int(x) for x in self.get_parameter("tag_ids").value)
        config_path = self.get_parameter("config_path").value
        self.face_normals: Dict[int, List[float]] = {}
        self._detected = False
        self._last_detected_time: Optional[float] = None
        if config_path:
            self._load_config(config_path)

        self.pub = self.create_publisher(PoseStamped, self.output_topic, 10)
        self.faces_pub = self.create_publisher(String, self.faces_topic, 10)
        self.detected_pub = self.create_publisher(Bool, self.detected_topic, 10)
        self.sub = self.create_subscription(MarkerArray, input_topic, self._on_markers, 10)
        self.detected_timer = self.create_timer(1.0 / max(self.detected_rate_hz, 1.0), self._publish_detected_status)

        self.get_logger().info(
            f"Cube pose fuser listening on {input_topic}, publishing {self.output_topic} and {self.detected_topic}"
        )

    def _publish_detected_status(self) -> None:
        now = self.get_clock().now().nanoseconds / 1e9
        detected = self._detected
        if detected and self._last_detected_time is not None:
            detected = (now - self._last_detected_time) <= self.detection_hold_sec
        else:
            detected = False
        self._detected = detected

        detected_msg = Bool()
        detected_msg.data = detected
        self.detected_pub.publish(detected_msg)

    def _load_config(self, config_path: str) -> None:
        try:
            if config_path.startswith("file://"):
                config_path = config_path[len("file://"):]
            if not os.path.exists(config_path):
                self.get_logger().error(f"Cube config not found: {config_path}")
                return
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            tag_ids = data.get("tag_ids")
            if isinstance(tag_ids, list) and tag_ids:
                self.tag_ids = set(int(x) for x in tag_ids)
            box_dims = data.get("box_dims")
            if isinstance(box_dims, list) and box_dims:
                # Use average of dimensions, convert mm -> meters
                avg_mm = sum(float(x) for x in box_dims) / len(box_dims)
                self.cube_size_m = avg_mm / 1000.0
            faces = data.get("faces", {})
            face_normals = {
                "+X": [1.0, 0.0, 0.0],
                "-X": [-1.0, 0.0, 0.0],
                "+Y": [0.0, 1.0, 0.0],
                "-Y": [0.0, -1.0, 0.0],
                "+Z": [0.0, 0.0, 1.0],
                "-Z": [0.0, 0.0, -1.0],
            }
            for face, ids in faces.items():
                if face not in face_normals:
                    continue
                for tag_id in ids:
                    self.face_normals[int(tag_id)] = face_normals[face]
            self.get_logger().info(
                f"Loaded cube config: tag_ids={sorted(self.tag_ids)}, cube_size_m={self.cube_size_m:.4f}"
            )
        except Exception as e:
            self.get_logger().error(f"Failed to load cube config: {e}")

    def _on_markers(self, msg: MarkerArray) -> None:
        centers = []
        quats = []
        pairs: List[Tuple[List[float], List[float]]] = []
        visible = []

        for marker in msg.markers:
            if marker.id not in self.tag_ids:
                continue
            pose = marker.pose.pose
            qx = pose.orientation.x
            qy = pose.orientation.y
            qz = pose.orientation.z
            qw = pose.orientation.w
            normal = _normalize(_rotate_z_axis(qx, qy, qz, qw))
            half = 0.5 * self.cube_size_m
            center = [
                pose.position.x - normal[0] * half,
                pose.position.y - normal[1] * half,
                pose.position.z - normal[2] * half,
            ]
            centers.append(center)
            quats.append([qx, qy, qz, qw])
            if marker.id in self.face_normals:
                pairs.append((self.face_normals[marker.id], normal))
            visible.append(str(marker.id))

        if not centers:
            # Publish an "empty" pose when no detections are present.
            empty = PoseStamped()
            empty.header = msg.header
            empty.pose.position.x = float("nan")
            empty.pose.position.y = float("nan")
            empty.pose.position.z = float("nan")
            empty.pose.orientation.x = 0.0
            empty.pose.orientation.y = 0.0
            empty.pose.orientation.z = 0.0
            empty.pose.orientation.w = 1.0
            self.pub.publish(empty)

            faces_msg = String()
            faces_msg.data = ""
            self.faces_pub.publish(faces_msg)
            self._detected = False
            return

        cx = sum(c[0] for c in centers) / len(centers)
        cy = sum(c[1] for c in centers) / len(centers)
        cz = sum(c[2] for c in centers) / len(centers)
        # Estimate cube orientation from face normals when possible.
        qx, qy, qz, qw = _avg_quaternions(quats)
        if len(pairs) >= 2:
            # Build orthonormal bases from two non-collinear normals
            n1_cube, n1_cam = pairs[0]
            idx = 1
            while idx < len(pairs):
                c2, m2 = pairs[idx]
                if math.sqrt(sum(x * x for x in _cross(n1_cube, c2))) > 1e-3 and math.sqrt(sum(x * x for x in _cross(n1_cam, m2))) > 1e-3:
                    n2_cube, n2_cam = c2, m2
                    break
                idx += 1
            else:
                n2_cube, n2_cam = None, None

            if n2_cube is not None and n2_cam is not None:
                c1 = _normalize(n1_cube)
                c2 = _normalize([x - c1[i] * _dot(c1, n2_cube) for i, x in enumerate(n2_cube)])
                c3 = _cross(c1, c2)

                m1 = _normalize(n1_cam)
                m2 = _normalize([x - m1[i] * _dot(m1, n2_cam) for i, x in enumerate(n2_cam)])
                m3 = _cross(m1, m2)

                # Rotation matrix R maps cube frame to camera frame
                R = [
                    [m1[0], m2[0], m3[0]],
                    [m1[1], m2[1], m3[1]],
                    [m1[2], m2[2], m3[2]],
                ]
                qx, qy, qz, qw = _matrix_to_quat(R)

        pose_msg = PoseStamped()
        pose_msg.header = msg.header
        pose_msg.pose.position.x = cx
        pose_msg.pose.position.y = cy
        pose_msg.pose.position.z = cz
        pose_msg.pose.orientation.x = qx
        pose_msg.pose.orientation.y = qy
        pose_msg.pose.orientation.z = qz
        pose_msg.pose.orientation.w = qw

        self.pub.publish(pose_msg)

        faces_msg = String()
        faces_msg.data = ",".join(sorted(visible, key=int))
        self.faces_pub.publish(faces_msg)
        self._detected = True
        self._last_detected_time = self.get_clock().now().nanoseconds / 1e9


def main() -> None:
    rclpy.init()
    node = CubePoseFuser()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
