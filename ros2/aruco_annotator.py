#!/usr/bin/env python3

from __future__ import annotations

import math
from typing import List, Optional, Tuple

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo
from aruco_markers_msgs.msg import MarkerArray
from geometry_msgs.msg import PoseStamped

try:
    import cv2  # type: ignore
    from cv_bridge import CvBridge  # type: ignore
except Exception:
    cv2 = None
    CvBridge = None


class ArucoAnnotator(Node):
    def __init__(self) -> None:
        super().__init__("aruco_annotator")
        self.declare_parameter("image_topic", "/mars/arm/image_raw")
        self.declare_parameter("markers_topic", "/aruco/markers")
        self.declare_parameter("cube_pose_topic", "/aruco/cube_pose")
        self.declare_parameter("camera_info_topic", "/mars/arm/camera_info")
        self.declare_parameter("output_topic", "/aruco/annotated")
        self.declare_parameter("axis_length_m", 0.02)

        image_topic = self.get_parameter("image_topic").value
        markers_topic = self.get_parameter("markers_topic").value
        cube_pose_topic = self.get_parameter("cube_pose_topic").value
        camera_info_topic = self.get_parameter("camera_info_topic").value
        output_topic = self.get_parameter("output_topic").value
        self.axis_length = float(self.get_parameter("axis_length_m").value)

        if cv2 is None or CvBridge is None:
            self.get_logger().error("cv2/cv_bridge not available; annotator disabled")
            return

        self.bridge = CvBridge()
        self.latest_markers: List = []
        self.last_cube_pose: Optional[PoseStamped] = None
        self.last_camera_info: Optional[CameraInfo] = None

        self.sub_img = self.create_subscription(Image, image_topic, self._on_image, 10)
        self.sub_markers = self.create_subscription(MarkerArray, markers_topic, self._on_markers, 10)
        self.sub_cube = self.create_subscription(PoseStamped, cube_pose_topic, self._on_cube_pose, 10)
        self.sub_info = self.create_subscription(CameraInfo, camera_info_topic, self._on_camera_info, 10)
        self.pub = self.create_publisher(Image, output_topic, 10)

        self.get_logger().info(
            f"Annotating {image_topic} with {markers_topic} -> {output_topic}"
        )

    def _on_markers(self, msg: MarkerArray) -> None:
        self.latest_markers = list(msg.markers)

    def _on_cube_pose(self, msg: PoseStamped) -> None:
        self.last_cube_pose = msg

    def _on_camera_info(self, msg: CameraInfo) -> None:
        self.last_camera_info = msg

    def _project_point(self, x: float, y: float, z: float) -> Optional[Tuple[int, int]]:
        if self.last_camera_info is None:
            return None
        if z <= 1e-6 or math.isnan(x) or math.isnan(y) or math.isnan(z):
            return None
        k = self.last_camera_info.k
        if len(k) < 9:
            return None
        fx = k[0]
        fy = k[4]
        cx = k[2]
        cy = k[5]
        u = (fx * x) / z + cx
        v = (fy * y) / z + cy
        if math.isnan(u) or math.isnan(v):
            return None
        return int(u), int(v)

    def _quat_to_matrix(self, qx: float, qy: float, qz: float, qw: float) -> List[List[float]]:
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

    def _draw_axes(self, img, pose: PoseStamped) -> None:
        pos = pose.pose.position
        ori = pose.pose.orientation
        origin_px = self._project_point(pos.x, pos.y, pos.z)
        if origin_px is None:
            return

        rot = self._quat_to_matrix(ori.x, ori.y, ori.z, ori.w)
        ax = [rot[0][0], rot[1][0], rot[2][0]]
        ay = [rot[0][1], rot[1][1], rot[2][1]]
        az = [rot[0][2], rot[1][2], rot[2][2]]

        def endpoint(axis):
            return (
                pos.x + axis[0] * self.axis_length,
                pos.y + axis[1] * self.axis_length,
                pos.z + axis[2] * self.axis_length,
            )

        x_px = self._project_point(*endpoint(ax))
        y_px = self._project_point(*endpoint(ay))
        z_px = self._project_point(*endpoint(az))

        if x_px is not None:
            cv2.line(img, origin_px, x_px, (0, 0, 255), 2)  # X red
        if y_px is not None:
            cv2.line(img, origin_px, y_px, (0, 255, 0), 2)  # Y green
        if z_px is not None:
            cv2.line(img, origin_px, z_px, (255, 0, 0), 2)  # Z blue

    def _on_image(self, msg: Image) -> None:
        if cv2 is None or CvBridge is None:
            return

        try:
            cv_img = self.bridge.imgmsg_to_cv2(msg, desired_encoding="passthrough")
        except Exception as e:
            self.get_logger().error(f"cv_bridge conversion failed: {e}")
            return

        encoding = msg.encoding.lower()
        if encoding == "rgb8":
            cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
        elif encoding == "mono8":
            cv_img = cv2.cvtColor(cv_img, cv2.COLOR_GRAY2BGR)
        elif encoding != "bgr8":
            # Unsupported encoding; just pass through
            annotated = self.bridge.cv2_to_imgmsg(cv_img, encoding=msg.encoding)
            annotated.header = msg.header
            self.pub.publish(annotated)
            return

        # Draw cube center XYZ (in camera frame) if available
        if self.last_cube_pose is not None:
            pos = self.last_cube_pose.pose.position
            px = self._project_point(pos.x, pos.y, pos.z)
            if px is not None:
                label = f"X:{pos.x:.2f} Y:{pos.y:.2f} Z:{pos.z:.2f}"
                cv2.circle(cv_img, px, 6, (0, 255, 255), 2)
                cv2.putText(
                    cv_img,
                    label,
                    (px[0] + 8, px[1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 255),
                    1,
                    cv2.LINE_AA,
                )
                self._draw_axes(cv_img, self.last_cube_pose)

        # Convert back to original encoding
        if encoding == "rgb8":
            cv_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        annotated = self.bridge.cv2_to_imgmsg(cv_img, encoding=msg.encoding)
        annotated.header = msg.header
        self.pub.publish(annotated)


def main() -> None:
    rclpy.init()
    node = ArucoAnnotator()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
