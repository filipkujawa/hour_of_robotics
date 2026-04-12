#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image


class ImageThrottle(Node):
    def __init__(self) -> None:
        super().__init__("image_throttle")
        self.declare_parameter("input_topic", "/image_raw")
        self.declare_parameter("output_topic", "/image_throttled")
        self.declare_parameter("rate_hz", 5.0)

        self.input_topic = self.get_parameter("input_topic").value
        self.output_topic = self.get_parameter("output_topic").value
        self.rate_hz = float(self.get_parameter("rate_hz").value)

        self._last_msg = None
        self.sub = self.create_subscription(Image, self.input_topic, self.on_image, 10)
        self.pub = self.create_publisher(Image, self.output_topic, 10)
        self.timer = self.create_timer(1.0 / max(self.rate_hz, 1.0), self.on_timer)

        self.get_logger().info(
            f"Throttling {self.input_topic} -> {self.output_topic} at {self.rate_hz:.2f} Hz"
        )

    def on_image(self, msg: Image) -> None:
        self._last_msg = msg

    def on_timer(self) -> None:
        if self._last_msg is None:
            return
        self.pub.publish(self._last_msg)


def main() -> None:
    rclpy.init()
    node = ImageThrottle()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
