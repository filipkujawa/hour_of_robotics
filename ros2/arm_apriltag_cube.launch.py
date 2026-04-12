#!/usr/bin/env python3

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration, TextSubstitution, PythonExpression
from launch_ros.actions import Node
import os
import sys


def generate_launch_description():
    default_params = os.path.join(
        os.path.dirname(__file__),
        "arm_apriltag_cube.yaml",
    )

    image_topic_arg = DeclareLaunchArgument(
        "image_topic",
        default_value="/mars/arm/image_raw",
        description="Arm camera image topic (raw or compressed)",
    )

    camera_info_topic_arg = DeclareLaunchArgument(
        "camera_info_topic",
        default_value="/mars/arm/camera_info",
        description="Arm camera info topic",
    )

    params_file_arg = DeclareLaunchArgument(
        "params_file",
        default_value=default_params,
        description="AprilTag params YAML",
    )

    camera_info_url_arg = DeclareLaunchArgument(
        "camera_info_url",
        default_value="",
        description="Camera calibration URL, e.g. file:///home/jetson1/.ros/arm_camera.yaml",
    )

    apriltag_node = Node(
        package="apriltag_ros",
        executable="apriltag_node",
        name="apriltag_arm_cube",
        output="screen",
        parameters=[LaunchConfiguration("params_file")],
        remappings=[
            ("image_rect", LaunchConfiguration("image_topic")),
            ("camera_info", LaunchConfiguration("camera_info_topic")),
        ],
    )

    camera_info_script = os.path.join(os.path.dirname(__file__), "arm_camera_info_publisher.py")
    camera_info_pub = ExecuteProcess(
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                camera_info_script,
                " --ros-args -p camera_info_url:=",
                LaunchConfiguration("camera_info_url"),
                " -p camera_info_topic:=",
                LaunchConfiguration("camera_info_topic"),
                " -p frame_id:=mars_arm_camera -p publish_rate_hz:=30.0 -p image_topic:=",
                LaunchConfiguration("image_topic"),
                "\"",
            ]),
        ],
        output="screen",
    )

    return LaunchDescription([
        image_topic_arg,
        camera_info_topic_arg,
        params_file_arg,
        camera_info_url_arg,
        camera_info_pub,
        apriltag_node,
    ])
