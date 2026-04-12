#!/usr/bin/env python3
"""Run the velocity+heading node the same way as the other ros2/*.py helpers (ExecuteProcess + bash -lc).

After rsync, typical tmux pane (adjust path):

  bash -lc 'source /opt/ros/humble/setup.bash && ros2 launch /path/to/ros2/velocity_heading_controller.launch.py'

One-shot test (peak linear m/s + duration s; trapezoidal ramp up/down inside T):

  ros2 topic pub --once /mars/drive_heading std_msgs/msg/Float64MultiArray '{data: [0.15, 2.0]}'

Cancel / stop segment:

  ros2 topic pub --once /mars/drive_heading std_msgs/msg/Float64MultiArray '{data: [0.0, 0.0]}'
"""

import os

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration, PythonExpression


def generate_launch_description():
    odom_topic_arg = DeclareLaunchArgument(
        "odom_topic",
        default_value="/odom",
        description="Odometry topic used for heading feedback",
    )

    cmd_vel_topic_arg = DeclareLaunchArgument(
        "cmd_vel_topic",
        default_value="/cmd_vel",
        description="Velocity command topic",
    )

    segment_cmd_topic_arg = DeclareLaunchArgument(
        "segment_cmd_topic",
        default_value="/mars/drive_heading",
        description="Float64MultiArray [linear_m_s, duration_s]; duration<=0 cancels",
    )

    kp_arg = DeclareLaunchArgument(
        "kp",
        default_value="1.5",
        description="Proportional gain for heading correction",
    )

    ki_arg = DeclareLaunchArgument(
        "ki",
        default_value="0.5",
        description="Integral gain for heading correction",
    )

    kd_arg = DeclareLaunchArgument(
        "kd",
        default_value="0.0",
        description="Derivative gain for heading correction",
    )

    trap_accel_arg = DeclareLaunchArgument(
        "trap_max_accel",
        default_value="0.4",
        description="Trapezoid linear ramp-up acceleration (m/s^2); 0 disables profile (constant v)",
    )

    trap_decel_arg = DeclareLaunchArgument(
        "trap_max_decel",
        default_value="0.4",
        description="Trapezoid linear ramp-down deceleration magnitude (m/s^2)",
    )

    script_path = os.path.join(os.path.dirname(__file__), "velocity_heading_controller.py")
    runner = ExecuteProcess(
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                script_path,
                " --ros-args -p odom_topic:=",
                LaunchConfiguration("odom_topic"),
                " -p cmd_vel_topic:=",
                LaunchConfiguration("cmd_vel_topic"),
                " -p segment_cmd_topic:=",
                LaunchConfiguration("segment_cmd_topic"),
                " -p kp:=",
                LaunchConfiguration("kp"),
                " -p ki:=",
                LaunchConfiguration("ki"),
                " -p kd:=",
                LaunchConfiguration("kd"),
                " -p trap_max_accel:=",
                LaunchConfiguration("trap_max_accel"),
                " -p trap_max_decel:=",
                LaunchConfiguration("trap_max_decel"),
                "\"",
            ]),
        ],
        output="screen",
    )

    return LaunchDescription([
        odom_topic_arg,
        cmd_vel_topic_arg,
        segment_cmd_topic_arg,
        kp_arg,
        ki_arg,
        kd_arg,
        trap_accel_arg,
        trap_decel_arg,
        runner,
    ])
