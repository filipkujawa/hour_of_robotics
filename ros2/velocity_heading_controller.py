#!/usr/bin/env python3
import math
from typing import Optional

import rclpy
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
from std_msgs.msg import Float64MultiArray


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


def plan_trapezoid_times(v_peak_mag: float, T: float, a: float, d: float) -> tuple[float, float, float, float]:
    """Return (t_acc, t_cruise, t_dec, v_plateau) all non-negative; v_plateau <= v_peak_mag."""
    v_peak_mag = max(0.0, float(v_peak_mag))
    T = max(0.0, float(T))
    a = max(1e-9, float(a))
    d = max(1e-9, float(d))

    if T <= 1e-9 or v_peak_mag <= 1e-12:
        return 0.0, max(0.0, T), 0.0, 0.0

    t_acc_full = v_peak_mag / a
    t_dec_full = v_peak_mag / d
    if t_acc_full + t_dec_full <= T:
        v_plateau = v_peak_mag
        t_acc = t_acc_full
        t_dec = t_dec_full
        t_cruise = max(0.0, T - t_acc - t_dec)
    else:
        v_plateau = (T * a * d) / (a + d)
        t_acc = v_plateau / a
        t_dec = v_plateau / d
        t_cruise = 0.0

    return t_acc, t_cruise, t_dec, v_plateau


class VelocityHeadingController(Node):
    def __init__(self) -> None:
        super().__init__("velocity_heading_controller")

        self.declare_parameter("odom_topic", "/odom")
        self.declare_parameter("cmd_vel_topic", "/cmd_vel")
        self.declare_parameter("segment_cmd_topic", "/mars/drive_heading")
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("kp", 2.0)
        self.declare_parameter("ki", 0.1)
        self.declare_parameter("kd", 0.0)
        self.declare_parameter("max_ang_vel", 1.0)
        self.declare_parameter("min_ang_vel", 0.0)
        self.declare_parameter("integral_limit", 1.0)
        self.declare_parameter("goal_tolerance_rad", 0.02)
        self.declare_parameter("odom_timeout_sec", 1.0)
        self.declare_parameter("trap_max_accel", 0.4)
        self.declare_parameter("trap_max_decel", 0.4)

        self.odom_topic = str(self.get_parameter("odom_topic").value)
        self.cmd_vel_topic = str(self.get_parameter("cmd_vel_topic").value)
        self.segment_cmd_topic = str(self.get_parameter("segment_cmd_topic").value)
        self.rate_hz = float(self.get_parameter("rate_hz").value)
        self.kp = float(self.get_parameter("kp").value)
        self.ki = float(self.get_parameter("ki").value)
        self.kd = float(self.get_parameter("kd").value)
        self.max_ang_vel = float(self.get_parameter("max_ang_vel").value)
        self.min_ang_vel = float(self.get_parameter("min_ang_vel").value)
        self.integral_limit = float(self.get_parameter("integral_limit").value)
        self.goal_tolerance = float(self.get_parameter("goal_tolerance_rad").value)
        self.odom_timeout_sec = max(0.1, float(self.get_parameter("odom_timeout_sec").value))

        self._yaw: Optional[float] = None
        self._last_odom_time: Optional[float] = None

        self._segment_active = False
        self._seg_v_peak_signed = 0.0
        self._seg_duration = 0.0
        self._seg_target_heading: Optional[float] = None
        self._seg_started_at: Optional[float] = None
        self._integral = 0.0
        self._prev_error: Optional[float] = None

        self._trap_use = False
        self._trap_a = 0.4
        self._trap_d = 0.4
        self._trap_t_acc = 0.0
        self._trap_t_cruise = 0.0
        self._trap_t_dec = 0.0
        self._trap_v_plateau = 0.0
        self._seg_sign = 1.0

        self.create_subscription(Odometry, self.odom_topic, self.on_odom, 10)
        self.create_subscription(Float64MultiArray, self.segment_cmd_topic, self.on_segment_cmd, 10)
        self.cmd_pub = self.create_publisher(Twist, self.cmd_vel_topic, 10)
        self.timer = self.create_timer(1.0 / max(self.rate_hz, 1.0), self.update)

        self.get_logger().info(
            f"Velocity heading controller ready. cmd topic={self.segment_cmd_topic} "
            f"(Float64MultiArray: [peak_linear_m_s, duration_s]; duration<=0 cancels; trapezoid accel/decel), "
            f"odom={self.odom_topic}, cmd_vel={self.cmd_vel_topic}"
        )

    def _clear_segment(self) -> None:
        self._segment_active = False
        self._seg_target_heading = None
        self._seg_started_at = None
        self._integral = 0.0
        self._prev_error = None
        self._trap_use = False

    def _setup_trapezoid(self, v_peak_signed: float, duration: float) -> None:
        self._seg_v_peak_signed = float(v_peak_signed)
        self._seg_sign = 1.0 if v_peak_signed >= 0.0 else -1.0
        v_mag = abs(float(v_peak_signed))

        raw_a = float(self.get_parameter("trap_max_accel").value)
        raw_d = float(self.get_parameter("trap_max_decel").value)
        self._trap_use = raw_a > 1e-6 and raw_d > 1e-6

        if not self._trap_use:
            self._trap_t_acc = 0.0
            self._trap_t_cruise = duration
            self._trap_t_dec = 0.0
            self._trap_v_plateau = v_mag
            self._trap_a = 1.0
            self._trap_d = 1.0
            return

        self._trap_a = raw_a
        self._trap_d = raw_d
        ta, tc, td, vp = plan_trapezoid_times(v_mag, duration, raw_a, raw_d)
        self._trap_t_acc = ta
        self._trap_t_cruise = tc
        self._trap_t_dec = td
        self._trap_v_plateau = vp

    def _linear_vel_trap(self, elapsed: float) -> float:
        """Unsigned linear speed at elapsed time into motion (after heading lock)."""
        if not self._trap_use:
            return abs(self._seg_v_peak_signed)

        ta = self._trap_t_acc
        tc = self._trap_t_cruise
        td = self._trap_t_dec
        vp = self._trap_v_plateau
        T = self._seg_duration
        a = self._trap_a

        if elapsed <= 0.0:
            return 0.0
        if elapsed >= T:
            return 0.0

        if elapsed < ta:
            return min(vp, a * elapsed)
        if elapsed < ta + tc:
            return vp
        if td <= 1e-9:
            return 0.0
        return max(0.0, vp * (T - elapsed) / td)

    def on_segment_cmd(self, msg: Float64MultiArray) -> None:
        if len(msg.data) < 2:
            self.get_logger().warning("segment cmd needs at least 2 elements: [linear_m_s, duration_s]")
            return

        linear = float(msg.data[0])
        duration = float(msg.data[1])

        if duration <= 0.0:
            if self._segment_active:
                self.publish_cmd(0.0, 0.0)
            self._clear_segment()
            return

        if self._segment_active:
            self.publish_cmd(0.0, 0.0)

        self._segment_active = True
        self._seg_duration = duration
        self._setup_trapezoid(linear, duration)
        self._seg_target_heading = None
        self._seg_started_at = None
        self._integral = 0.0
        self._prev_error = None
        self.get_logger().info(
            f"Segment: peak_linear={self._seg_v_peak_signed:.3f} m/s, T={self._seg_duration:.3f} s, "
            f"trap={self._trap_use} (t_acc={self._trap_t_acc:.3f} t_cr={self._trap_t_cruise:.3f} "
            f"t_dec={self._trap_t_dec:.3f} v_plat={self._trap_v_plateau:.3f})"
        )

    def on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        self._yaw = yaw_from_quat(q.x, q.y, q.z, q.w)
        self._last_odom_time = self.get_clock().now().nanoseconds / 1e9

        if not self._segment_active or self._seg_target_heading is not None:
            return

        self._seg_target_heading = wrap_angle(self._yaw)
        self.get_logger().info(f"Holding current heading {self._seg_target_heading:.3f} rad")
        self._seg_started_at = self.get_clock().now().nanoseconds / 1e9

    def update(self) -> None:
        if not self._segment_active:
            return

        now = self.get_clock().now().nanoseconds / 1e9

        if self._last_odom_time is None or (now - self._last_odom_time) > self.odom_timeout_sec:
            self.get_logger().warning("Odometry stale; stopping segment")
            self.publish_cmd(0.0, 0.0)
            self._clear_segment()
            return

        if self._yaw is None or self._seg_target_heading is None or self._seg_started_at is None:
            return

        elapsed = now - self._seg_started_at
        if elapsed >= self._seg_duration:
            self.publish_cmd(0.0, 0.0)
            self._clear_segment()
            self.get_logger().info("Velocity segment complete")
            return

        error = wrap_angle(self._seg_target_heading - self._yaw)
        dt = 1.0 / max(self.rate_hz, 1.0)

        if abs(error) <= self.goal_tolerance:
            ang_z = 0.0
            self._integral = 0.0
            self._prev_error = error
        else:
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

        lin_x = self._seg_sign * self._linear_vel_trap(elapsed)
        self.publish_cmd(lin_x, ang_z)

    def publish_cmd(self, linear_x: float, ang_z: float) -> None:
        twist = Twist()
        twist.linear.x = float(linear_x)
        twist.angular.z = float(ang_z)
        self.cmd_pub.publish(twist)


def main() -> None:
    rclpy.init()
    node = VelocityHeadingController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.publish_cmd(0.0, 0.0)
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
