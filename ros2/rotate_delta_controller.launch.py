#!/usr/bin/env python3
"""Run the delta-heading turn controller.

Example:

  bash -lc 'source /opt/ros/humble/setup.bash && ros2 launch /path/to/ros2/rotate_delta_controller.launch.py'

Turn left 90 degrees:

  ros2 topic pub --once /mars/rotate_delta std_msgs/msg/Float64 '{data: 1.5708}'

Cancel:

  ros2 topic pub --once /mars/rotate_delta std_msgs/msg/Float64 '{data: 0.0}'
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

    rotate_cmd_topic_arg = DeclareLaunchArgument(
        "rotate_cmd_topic",
        default_value="/mars/rotate_delta",
        description="Float64 delta heading command topic in radians; 0 cancels",
    )

    kp_arg = DeclareLaunchArgument("kp", default_value="2.5", description="Proportional gain")
    ki_arg = DeclareLaunchArgument("ki", default_value="0.0", description="Integral gain")
    kd_arg = DeclareLaunchArgument("kd", default_value="0.1", description="Derivative gain")

    script_path = os.path.join(os.path.dirname(__file__), "rotate_delta_controller.py")
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
                " -p rotate_cmd_topic:=",
                LaunchConfiguration("rotate_cmd_topic"),
                " -p kp:=",
                LaunchConfiguration("kp"),
                " -p ki:=",
                LaunchConfiguration("ki"),
                " -p kd:=",
                LaunchConfiguration("kd"),
                "\"",
            ]),
        ],
        output="screen",
    )

    return LaunchDescription([
        odom_topic_arg,
        cmd_vel_topic_arg,
        rotate_cmd_topic_arg,
        kp_arg,
        ki_arg,
        kd_arg,
        runner,
    ])
