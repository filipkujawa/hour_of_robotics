#!/usr/bin/env python3

from __future__ import annotations

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image
from urllib.parse import urlparse

try:
    from camera_info_manager import CameraInfoManager  # type: ignore
except Exception:  # pragma: no cover - fallback if ROS Python path is missing
    CameraInfoManager = None

try:
    import yaml  # type: ignore
except Exception:
    yaml = None


class ArmCameraInfoPublisher(Node):
    def __init__(self) -> None:
        super().__init__("arm_camera_info_publisher")

        self.declare_parameter("camera_name", "arm_camera")
        self.declare_parameter("camera_info_url", "")
        self.declare_parameter("frame_id", "mars_arm_camera")
        self.declare_parameter("camera_info_topic", "/mars/arm/camera_info")
        self.declare_parameter("image_topic", "/mars/arm/image_raw")
        self.declare_parameter("publish_rate_hz", 5.0)

        camera_name = self.get_parameter("camera_name").value
        camera_info_url = self.get_parameter("camera_info_url").value
        self.frame_id = self.get_parameter("frame_id").value
        topic = self.get_parameter("camera_info_topic").value
        image_topic = self.get_parameter("image_topic").value
        publish_rate_hz = float(self.get_parameter("publish_rate_hz").value)

        self.info_manager = None
        self.static_info = None

        if CameraInfoManager is not None:
            self.info_manager = CameraInfoManager(self, camera_name)
            if camera_info_url:
                self.info_manager.loadCameraInfo(camera_info_url)
            else:
                self.get_logger().warn("camera_info_url is empty; publishing uncalibrated CameraInfo")
        else:
            if not camera_info_url:
                self.get_logger().warn("camera_info_url is empty; publishing uncalibrated CameraInfo")
            else:
                self.static_info = self._load_camera_info(camera_info_url)

        self.pub = self.create_publisher(CameraInfo, topic, 10)
        self.last_image_header = None
        self.image_sub = self.create_subscription(
            Image,
            image_topic,
            self._image_callback,
            10,
        )

        period = 1.0 / publish_rate_hz if publish_rate_hz > 0 else 0.033
        self.timer = self.create_timer(period, self.publish_info)
        self.get_logger().info(
            f"Publishing CameraInfo on {topic} at {1.0 / period:.2f} Hz, syncing to {image_topic}"
        )

    def publish_info(self) -> None:
        if self.info_manager is not None:
            info = self.info_manager.getCameraInfo()
        elif self.static_info is not None:
            info = self.static_info
        else:
            info = CameraInfo()
        if self.last_image_header is not None:
            info.header.stamp = self.last_image_header.stamp
        else:
            info.header.stamp = self.get_clock().now().to_msg()
        info.header.frame_id = self.frame_id
        self.pub.publish(info)

    def _image_callback(self, msg: Image) -> None:
        self.last_image_header = msg.header

    def _load_camera_info(self, camera_info_url: str) -> CameraInfo | None:
        if yaml is None:
            self.get_logger().error("PyYAML is not installed; cannot load camera_info_url")
            return None
        parsed = urlparse(camera_info_url)
        if parsed.scheme not in ("", "file"):
            self.get_logger().error(f"Unsupported camera_info_url scheme: {parsed.scheme}")
            return None
        path = parsed.path if parsed.scheme == "file" else camera_info_url
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except Exception as e:
            self.get_logger().error(f"Failed to read camera_info_url: {e}")
            return None

        info = CameraInfo()
        info.width = int(data.get("image_width", 0))
        info.height = int(data.get("image_height", 0))
        info.distortion_model = data.get("distortion_model", "")
        info.d = data.get("distortion_coefficients", {}).get("data", [])
        info.k = data.get("camera_matrix", {}).get("data", [])
        info.r = data.get("rectification_matrix", {}).get("data", [])
        info.p = data.get("projection_matrix", {}).get("data", [])
        return info


def main() -> None:
    rclpy.init()
    node = ArmCameraInfoPublisher()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
