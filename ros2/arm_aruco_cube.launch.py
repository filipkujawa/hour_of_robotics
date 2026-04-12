#!/usr/bin/env python3

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.conditions import IfCondition
from launch.substitutions import LaunchConfiguration, PythonExpression
from launch_ros.actions import Node
import os


def generate_launch_description():
    image_topic_arg = DeclareLaunchArgument(
        "image_topic",
        default_value="/mars/arm/image_raw",
        description="Arm camera image topic",
    )

    camera_info_topic_arg = DeclareLaunchArgument(
        "camera_info_topic",
        default_value="/mars/arm/camera_info",
        description="Arm camera info topic",
    )

    camera_info_url_arg = DeclareLaunchArgument(
        "camera_info_url",
        default_value="",
        description="Camera calibration URL, e.g. file:///home/jetson1/.ros/arm_camera.yaml",
    )

    camera_frame_arg = DeclareLaunchArgument(
        "camera_frame",
        default_value="mars_arm_camera",
        description="Frame id for detections",
    )

    enable_annotator_arg = DeclareLaunchArgument(
        "enable_annotator",
        default_value="true",
        description="Set false to disable image annotation (saves memory)",
    )

    enable_throttle_arg = DeclareLaunchArgument(
        "enable_throttle",
        default_value="true",
        description="Set true to throttle images before detection",
    )

    throttle_rate_arg = DeclareLaunchArgument(
        "throttle_rate_hz",
        default_value="8.0",
        description="Image throttle rate (Hz)",
    )

    throttled_image_arg = DeclareLaunchArgument(
        "throttled_image_topic",
        default_value="/aruco/arm/image_raw",
        description="Throttled image topic for detection",
    )

    camera_info_rate_arg = DeclareLaunchArgument(
        "camera_info_rate_hz",
        default_value="10.0",
        description="CameraInfo publish rate (Hz) to reduce memory",
    )

    detection_image_topic = PythonExpression([
        "\"",
        LaunchConfiguration("enable_throttle"),
        "\" == \"true\" and \"",
        LaunchConfiguration("throttled_image_topic"),
        "\" or \"",
        LaunchConfiguration("image_topic"),
        "\"",
    ])

    throttle_script = os.path.join(os.path.dirname(__file__), "image_throttle.py")
    throttle = ExecuteProcess(
        condition=IfCondition(LaunchConfiguration("enable_throttle")),
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                throttle_script,
                " --ros-args -p input_topic:=",
                LaunchConfiguration("image_topic"),
                " -p output_topic:=",
                LaunchConfiguration("throttled_image_topic"),
                " -p rate_hz:=",
                LaunchConfiguration("throttle_rate_hz"),
                "\"",
            ]),
        ],
        output="screen",
    )

    aruco_node = Node(
        package="aruco_markers",
        executable="aruco_markers",
        name="aruco_arm_cube",
        output="screen",
        parameters=[
            {
                "marker_size": 0.03,
                "dictionary": "DICT_4X4_50",
                "image_topic": detection_image_topic,
                "camera_info_topic": LaunchConfiguration("camera_info_topic"),
                "camera_frame": LaunchConfiguration("camera_frame"),
            }
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
                " -p frame_id:=",
                LaunchConfiguration("camera_frame"),
                " -p publish_rate_hz:=",
                LaunchConfiguration("camera_info_rate_hz"),
                " -p image_topic:=",
                LaunchConfiguration("image_topic"),
                "\"",
            ]),
        ],
        output="screen",
    )

    cube_fuser_script = os.path.join(os.path.dirname(__file__), "cube_pose_fuser.py")
    cube_config = os.path.join(os.path.dirname(__file__), "arm_apriltag_cube.json")
    cube_fuser = ExecuteProcess(
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                cube_fuser_script,
                " --ros-args -p input_topic:=/aruco/markers -p output_topic:=/aruco/cube_pose",
                " -p faces_topic:=/aruco/cube_faces -p detected_topic:=/aruco/detected -p config_path:=",
                cube_config,
                "\"",
            ]),
        ],
        output="screen",
    )

    annotator_script = os.path.join(os.path.dirname(__file__), "aruco_annotator.py")
    annotator = ExecuteProcess(
        condition=IfCondition(LaunchConfiguration("enable_annotator")),
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                annotator_script,
                " --ros-args -p image_topic:=",
                detection_image_topic,
                " -p markers_topic:=/aruco/markers -p cube_pose_topic:=/aruco/cube_pose",
                " -p camera_info_topic:=",
                LaunchConfiguration("camera_info_topic"),
                " -p output_topic:=/aruco/annotated\"",
            ]),
        ],
        output="screen",
    )

    return LaunchDescription([
        image_topic_arg,
        camera_info_topic_arg,
        camera_info_url_arg,
        camera_frame_arg,
        enable_annotator_arg,
        enable_throttle_arg,
        throttle_rate_arg,
        throttled_image_arg,
        camera_info_rate_arg,
        camera_info_pub,
        throttle,
        cube_fuser,
        annotator,
        aruco_node,
    ])
