# Arm AprilTag Setup (hour_of_robotics)

This folder contains a self-contained launch file and helper script to run AprilTag detection on the arm camera **without modifying the camera driver**.

## Files

- `arm_apriltag_cube.launch.py` — launch file that runs AprilTag detection + a `camera_info` publisher
- `arm_camera_info_publisher.py` — publishes `sensor_msgs/CameraInfo` from a calibration YAML
- `arm_apriltag_cube.yaml` — AprilTag detector params
- `arm_apriltag_cube.json` — your cube definition (for reference)

## 1. Install ROS dependencies (Humble)

```bash
sudo apt update
sudo apt install ros-humble-apriltag-ros ros-humble-camera-info-manager
```

## 2. Run the arm camera driver (unchanged)

```bash
ros2 launch maurice_cam arm_camera_driver.launch.py
```

This should publish `/mars/arm/image_raw`. There is **no** `/mars/arm/camera_info` from the driver, so we provide it below.

## 3. Calibrate the arm camera

Generate a calibration YAML:

```bash
ros2 run camera_calibration cameracalibrator \
  --size 7x6 --square 0.025 \
  image:=/mars/arm/image_raw camera:=/mars/arm
```

Save the resulting calibration to something like:

```
~/.ros/arm_camera.yaml
```

## 4. Launch AprilTag detection + camera_info publisher

```bash
ros2 launch /home/max/Documents/github/hour_of_robotics/ros2/arm_apriltag_cube.launch.py \
  image_topic:=/mars/arm/image_raw \
  camera_info_topic:=/mars/arm/camera_info \
  camera_info_url:=file:///home/jetson1/.ros/arm_camera.yaml
```

## ArUco cube detection (4x4_50)

```bash
bash -lc 'source /opt/ros/humble/setup.bash && ros2 launch /home/jetson1/ros2/arm_aruco_cube.launch.py image_topic:=/mars/arm/image_raw camera_info_topic:=/mars/arm/camera_info camera_info_url:=file:///home/jetson1/.ros/arm_camera.yaml'
```

Detections:
- `/aruco/markers` (per-tag detections)
- `/aruco/cube_pose` (fused cube pose from visible faces)
- `/aruco/cube_faces` (CSV of visible tag IDs)
- `/aruco/annotated` (image with tag IDs overlay)
- `/aruco/cube_pose` uses NaN position when no detections are present

## Left stereo (compressed) ArUco detection

Raw (preferred):
```bash
bash -lc 'source /opt/ros/humble/setup.bash && ros2 launch /home/jetson1/ros2/left_aruco_cube.launch.py image_topic:=/mars/main_camera/left/image_raw camera_info_topic:=/mars/main_camera/left/camera_info'
```

Compressed (if you must):
```bash
bash -lc 'source /opt/ros/humble/setup.bash && ros2 launch /home/jetson1/ros2/left_aruco_cube.launch.py use_compressed:=true input_compressed:=/mars/main_camera/left/image_raw/compressed image_topic:=/aruco_left/image_raw camera_info_topic:=/mars/main_camera/left/camera_info'
```

Detections:
- `/aruco_left/markers`
- `/aruco_left/cube_pose`
- `/aruco_left/cube_faces`
- `/aruco_left/annotated`

## Notes

- The detector config is set to AprilTag **family `16h5`** by default.
- Your cube config says `dict: 4x4_50`, which is **ArUco**, not AprilTag. If your cube is truly ArUco, the `apriltag_ros` node will not detect it. In that case, tell me and I’ll set up the ArUco pipeline instead.
