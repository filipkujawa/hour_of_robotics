#!/usr/bin/env bash
set -euo pipefail

source /home/jetson1/innate-os/dds/setup_dds.zsh
source /home/jetson1/innate-os/ros2_ws/install/setup.zsh

chrt -o 0 ros2 launch "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/rotate_delta_controller.launch.py"
