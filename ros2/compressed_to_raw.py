#!/usr/bin/env python3

from __future__ import annotations

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage, Image

try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
    from cv_bridge import CvBridge  # type: ignore
except Exception:
    cv2 = None
    np = None
    CvBridge = None


class CompressedToRaw(Node):
    def __init__(self) -> None:
        super().__init__("compressed_to_raw")
        self.declare_parameter("input_topic", "/mars/main_camera/left/image_raw/compressed")
        self.declare_parameter("output_topic", "/aruco_left/image_raw")
        self.declare_parameter("output_encoding", "bgr8")

        input_topic = self.get_parameter("input_topic").value
        output_topic = self.get_parameter("output_topic").value
        self.output_encoding = self.get_parameter("output_encoding").value

        if cv2 is None or np is None or CvBridge is None:
            self.get_logger().error("cv2/numpy/cv_bridge not available; converter disabled")
            return

        self.bridge = CvBridge()
        self.pub = self.create_publisher(Image, output_topic, 10)
        self.sub = self.create_subscription(CompressedImage, input_topic, self._on_msg, 10)
        self.get_logger().info(f"Republishing {input_topic} -> {output_topic}")

    def _on_msg(self, msg: CompressedImage) -> None:
        if cv2 is None or np is None or CvBridge is None:
            return
        try:
            np_arr = np.frombuffer(msg.data, np.uint8)
            cv_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if cv_img is None:
                self.get_logger().warn("Failed to decode compressed image")
                return
            out = self.bridge.cv2_to_imgmsg(cv_img, encoding=self.output_encoding)
            out.header = msg.header
            self.pub.publish(out)
        except Exception as e:
            self.get_logger().error(f"Compressed decode failed: {e}")


def main() -> None:
    rclpy.init()
    node = CompressedToRaw()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
