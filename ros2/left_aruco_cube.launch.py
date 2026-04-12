#!/usr/bin/env python3

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.conditions import IfCondition
from launch.substitutions import LaunchConfiguration, PythonExpression, TextSubstitution
from launch_ros.actions import Node
import os


def generate_launch_description():
    use_compressed_arg = DeclareLaunchArgument(
        "use_compressed",
        default_value="false",
        description="Set true to decode a compressed topic into raw",
    )

    image_topic_arg = DeclareLaunchArgument(
        "image_topic",
        default_value="/mars/main_camera/left/image_raw",
        description="Raw left camera image topic for detection",
    )

    input_compressed_arg = DeclareLaunchArgument(
        "input_compressed",
        default_value="/mars/main_camera/left/image_raw/compressed",
        description="Compressed left camera image topic",
    )

    raw_output_arg = DeclareLaunchArgument(
        "raw_output",
        default_value="/aruco_left/image_raw",
        description="Raw image topic for ArUco detection",
    )

    camera_info_topic_arg = DeclareLaunchArgument(
        "camera_info_topic",
        default_value="/mars/main_camera/left/camera_info",
        description="Left camera info topic",
    )

    camera_frame_arg = DeclareLaunchArgument(
        "camera_frame",
        default_value="mars_main_left_camera",
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
        default_value="/aruco_left/image_raw",
        description="Throttled image topic for detection",
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

    converter_script = os.path.join(os.path.dirname(__file__), "compressed_to_raw.py")
    converter = ExecuteProcess(
        condition=IfCondition(LaunchConfiguration("use_compressed")),
        cmd=[
            "bash",
            "-lc",
            PythonExpression([
                "\"source /opt/ros/humble/setup.bash && /usr/bin/python3 ",
                converter_script,
                " --ros-args -p input_topic:=",
                LaunchConfiguration("input_compressed"),
                " -p output_topic:=",
                LaunchConfiguration("raw_output"),
                "\"",
            ]),
        ],
        output="screen",
    )

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
        name="aruco_left_cube",
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
        remappings=[
            ("/aruco/markers", "/aruco_left/markers"),
        ],
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
                " --ros-args -p input_topic:=/aruco_left/markers -p output_topic:=/aruco_left/cube_pose",
                " -p faces_topic:=/aruco_left/cube_faces -p detected_topic:=/aruco_left/detected -p config_path:=",
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
                " -p markers_topic:=/aruco_left/markers -p cube_pose_topic:=/aruco_left/cube_pose",
                " -p camera_info_topic:=",
                LaunchConfiguration("camera_info_topic"),
                " -p output_topic:=/aruco_left/annotated\"",
            ]),
        ],
        output="screen",
    )

    return LaunchDescription([
        use_compressed_arg,
        image_topic_arg,
        input_compressed_arg,
        raw_output_arg,
        camera_info_topic_arg,
        camera_frame_arg,
        enable_annotator_arg,
        enable_throttle_arg,
        throttle_rate_arg,
        throttled_image_arg,
        converter,
        throttle,
        cube_fuser,
        annotator,
        aruco_node,
    ])
