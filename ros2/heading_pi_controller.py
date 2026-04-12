#!/usr/bin/env python3
import math
from typing import Optional

import rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from geometry_msgs.msg import Twist
from std_msgs.msg import Float64


def yaw_from_quat(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def wrap_angle(angle: float) -> float:
    while angle > math.pi:
        angle -= 2.0 * math.pi
    while angle < -math.pi:
        angle += 2.0 * math.pi
    return angle


class HeadingPIController(Node):
    def __init__(self) -> None:
        super().__init__("heading_pi_controller")

        self.declare_parameter("goal_topic", "/heading_goal")
        self.declare_parameter("odom_topic", "/odom")
        self.declare_parameter("cmd_vel_topic", "/cmd_vel")
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("kp", 1.5)
        self.declare_parameter("ki", 0.0)
        self.declare_parameter("max_ang_vel", 1.0)
        self.declare_parameter("min_ang_vel", 0.05)
        self.declare_parameter("integral_limit", 1.0)
        self.declare_parameter("goal_tolerance_rad", 0.02)

        self.goal_topic = self.get_parameter("goal_topic").value
        self.odom_topic = self.get_parameter("odom_topic").value
        self.cmd_vel_topic = self.get_parameter("cmd_vel_topic").value
        self.rate_hz = float(self.get_parameter("rate_hz").value)
        self.kp = float(self.get_parameter("kp").value)
        self.ki = float(self.get_parameter("ki").value)
        self.max_ang_vel = float(self.get_parameter("max_ang_vel").value)
        self.min_ang_vel = float(self.get_parameter("min_ang_vel").value)
        self.integral_limit = float(self.get_parameter("integral_limit").value)
        self.goal_tolerance = float(self.get_parameter("goal_tolerance_rad").value)

        self._yaw: Optional[float] = None
        self._goal: Optional[float] = None
        self._integral = 0.0

        self.create_subscription(Odometry, self.odom_topic, self.on_odom, 10)
        self.create_subscription(Float64, self.goal_topic, self.on_goal, 10)
        self.cmd_pub = self.create_publisher(Twist, self.cmd_vel_topic, 10)

        self.timer = self.create_timer(1.0 / max(self.rate_hz, 1.0), self.update)
        self.get_logger().info(
            f"Heading PI ready. goal={self.goal_topic}, odom={self.odom_topic}, cmd_vel={self.cmd_vel_topic}"
        )

    def on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        self._yaw = yaw_from_quat(q.x, q.y, q.z, q.w)

    def on_goal(self, msg: Float64) -> None:
        self._goal = wrap_angle(float(msg.data))
        self._integral = 0.0
        self.get_logger().info(f"New heading goal: {self._goal:.3f} rad")

    def update(self) -> None:
        if self._goal is None or self._yaw is None:
            return

        error = wrap_angle(self._goal - self._yaw)

        if abs(error) <= self.goal_tolerance:
            self.publish_cmd(0.0)
            return

        dt = 1.0 / max(self.rate_hz, 1.0)
        self._integral = max(-self.integral_limit, min(self.integral_limit, self._integral + error * dt))

        cmd = self.kp * error + self.ki * self._integral
        cmd = max(-self.max_ang_vel, min(self.max_ang_vel, cmd))

        if abs(cmd) < self.min_ang_vel:
            cmd = self.min_ang_vel if cmd >= 0.0 else -self.min_ang_vel

        self.publish_cmd(cmd)

    def publish_cmd(self, ang_z: float) -> None:
        twist = Twist()
        twist.linear.x = 0.0
        twist.angular.z = float(ang_z)
        self.cmd_pub.publish(twist)


def main() -> None:
    rclpy.init()
    node = HeadingPIController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.publish_cmd(0.0)
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
