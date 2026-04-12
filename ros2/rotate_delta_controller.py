#!/usr/bin/env python3
import math
from typing import Optional

import rclpy
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
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


class RotateDeltaController(Node):
    def __init__(self) -> None:
        super().__init__("rotate_delta_controller")

        self.declare_parameter("odom_topic", "/odom")
        self.declare_parameter("cmd_vel_topic", "/cmd_vel")
        self.declare_parameter("rotate_cmd_topic", "/mars/rotate_delta")
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("kp", 2.5)
        self.declare_parameter("ki", 0.0)
        self.declare_parameter("kd", 0.1)
        self.declare_parameter("max_ang_vel", 1.0)
        self.declare_parameter("min_ang_vel", 0.12)
        self.declare_parameter("integral_limit", 1.0)
        self.declare_parameter("goal_tolerance_rad", 0.02)
        self.declare_parameter("settle_time_sec", 0.15)
        self.declare_parameter("odom_timeout_sec", 1.0)

        self.odom_topic = str(self.get_parameter("odom_topic").value)
        self.cmd_vel_topic = str(self.get_parameter("cmd_vel_topic").value)
        self.rotate_cmd_topic = str(self.get_parameter("rotate_cmd_topic").value)
        self.rate_hz = float(self.get_parameter("rate_hz").value)
        self.kp = float(self.get_parameter("kp").value)
        self.ki = float(self.get_parameter("ki").value)
        self.kd = float(self.get_parameter("kd").value)
        self.max_ang_vel = float(self.get_parameter("max_ang_vel").value)
        self.min_ang_vel = float(self.get_parameter("min_ang_vel").value)
        self.integral_limit = float(self.get_parameter("integral_limit").value)
        self.goal_tolerance = float(self.get_parameter("goal_tolerance_rad").value)
        self.settle_time_sec = max(0.0, float(self.get_parameter("settle_time_sec").value))
        self.odom_timeout_sec = max(0.1, float(self.get_parameter("odom_timeout_sec").value))

        self._yaw: Optional[float] = None
        self._continuous_yaw: Optional[float] = None
        self._last_yaw_for_unwrap: Optional[float] = None
        self._last_odom_time: Optional[float] = None
        self._active = False
        self._start_continuous_yaw: Optional[float] = None
        self._target_delta: Optional[float] = None
        self._pending_delta: Optional[float] = None
        self._integral = 0.0
        self._prev_error: Optional[float] = None
        self._within_tol_since: Optional[float] = None

        self.create_subscription(Odometry, self.odom_topic, self.on_odom, 10)
        self.create_subscription(Float64, self.rotate_cmd_topic, self.on_rotate_cmd, 10)
        self.cmd_pub = self.create_publisher(Twist, self.cmd_vel_topic, 10)
        self.timer = self.create_timer(1.0 / max(self.rate_hz, 1.0), self.update)

        self.get_logger().info(
            f"Rotate delta controller ready. cmd topic={self.rotate_cmd_topic} "
            f"(Float64: delta_theta_rad, 0 cancels), odom={self.odom_topic}, cmd_vel={self.cmd_vel_topic}"
        )

    def _clear_goal(self) -> None:
        self._active = False
        self._start_continuous_yaw = None
        self._target_delta = None
        self._pending_delta = None
        self._integral = 0.0
        self._prev_error = None
        self._within_tol_since = None

    def _set_target_from_delta(self, delta_theta: float) -> None:
        if self._continuous_yaw is None:
            self._pending_delta = delta_theta
            self._active = True
            return

        self._active = True
        self._pending_delta = None
        self._start_continuous_yaw = self._continuous_yaw
        self._target_delta = delta_theta
        self._integral = 0.0
        self._prev_error = None
        self._within_tol_since = None
        self.get_logger().info(
            f"Rotate command: delta={delta_theta:.3f} rad"
        )

    def on_rotate_cmd(self, msg: Float64) -> None:
        delta_theta = float(msg.data)

        if abs(delta_theta) <= 1e-6:
            self.publish_cmd(0.0)
            self._clear_goal()
            self.get_logger().info("Rotate command canceled")
            return

        self.publish_cmd(0.0)
        self._clear_goal()
        self._set_target_from_delta(delta_theta)

    def on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        self._yaw = yaw_from_quat(q.x, q.y, q.z, q.w)
        if self._last_yaw_for_unwrap is None or self._continuous_yaw is None:
            self._continuous_yaw = self._yaw
        else:
            self._continuous_yaw += wrap_angle(self._yaw - self._last_yaw_for_unwrap)
        self._last_yaw_for_unwrap = self._yaw
        self._last_odom_time = self.get_clock().now().nanoseconds / 1e9

        if self._active and self._target_delta is None and self._pending_delta is not None:
            self._set_target_from_delta(self._pending_delta)

    def update(self) -> None:
        if not self._active:
            return

        now = self.get_clock().now().nanoseconds / 1e9

        if self._last_odom_time is None or (now - self._last_odom_time) > self.odom_timeout_sec:
            self.get_logger().warning("Odometry stale; stopping rotation")
            self.publish_cmd(0.0)
            self._clear_goal()
            return

        if self._continuous_yaw is None or self._start_continuous_yaw is None or self._target_delta is None:
            return

        turned = self._continuous_yaw - self._start_continuous_yaw
        error = self._target_delta - turned
        dt = 1.0 / max(self.rate_hz, 1.0)

        if abs(error) <= self.goal_tolerance:
            if self._within_tol_since is None:
                self._within_tol_since = now
            self.publish_cmd(0.0)
            self._integral = 0.0
            self._prev_error = error
            if (now - self._within_tol_since) >= self.settle_time_sec:
                self.get_logger().info("Rotation complete")
                self._clear_goal()
            return

        self._within_tol_since = None
        self._integral = max(
            -self.integral_limit,
            min(self.integral_limit, self._integral + error * dt),
        )
        derivative = 0.0 if self._prev_error is None else (error - self._prev_error) / dt
        self._prev_error = error

        ang_z = self.kp * error + self.ki * self._integral + self.kd * derivative
        ang_z = max(-self.max_ang_vel, min(self.max_ang_vel, ang_z))

        if self.min_ang_vel > 0.0 and abs(ang_z) < self.min_ang_vel:
            ang_z = self.min_ang_vel if ang_z >= 0.0 else -self.min_ang_vel

        self.publish_cmd(ang_z)

    def publish_cmd(self, ang_z: float) -> None:
        twist = Twist()
        twist.linear.x = 0.0
        twist.angular.z = float(ang_z)
        self.cmd_pub.publish(twist)


def main() -> None:
    rclpy.init()
    node = RotateDeltaController()
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
