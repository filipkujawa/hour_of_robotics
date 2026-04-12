# Hour of Robotics

An interactive learning platform for teaching high school students to program the **Innate MARS robot** using Blockly visual programming, live Python code generation, and real-time robot control over ROS2.

## Architecture

```
┌─────────────────────────────────┐
│   Next.js Web App (Frontend)    │
│  Blockly → Python → Executor    │
│  Lesson Content (MDX)           │
└──────────┬──────────┬───────────┘
           │ WS       │ HTTP
           ▼          ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ MARS Robot   │  │ Vision Srv   │  │ Simulation   │
│ (rosbridge)  │  │ (OWLv2)      │  │ (Rerun+IK)   │
│ :9090        │  │ :8910        │  │ :8000        │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Three main subsystems:**

1. **Frontend** — Next.js web app with Blockly workspace, MDX lesson content, and real-time robot control
2. **Simulation** — Python-based MARS robot simulator with Rerun 3D visualization, IK solver, and collision checking
3. **Robot Integration** — ROS2 drivers, vision processing, and WebSocket bridge to the physical robot

## Stack

**Frontend:** Next.js 16, React 19, Blockly 12.5, roslib, Rerun web viewer, next-mdx-remote, Framer Motion, Zustand, Tailwind CSS

**Python:** FastAPI, Rerun SDK, ikpy, PyTorch + Transformers (OWLv2), OpenCV, python-fcl, rclpy, websockets

**Infrastructure:** Docker Compose for Gemma/Ollama LLM

## Development

```bash
npm install
npm run dev
```

The web app starts at `http://localhost:3000`.

### Local Gemma (AI Chat)

Run Gemma locally through Ollama in Docker so the web app can call it:

```bash
cp .env.example .env.local
docker compose --env-file .env.local -f docker-compose.gemma.yml up -d
```

This starts an Ollama container on `http://127.0.0.1:11434` and pulls `gemma3:1b` by default. Override the model in `.env.local` with `GEMMA_MODEL=gemma3:4b` or another Ollama-compatible tag if your machine can handle it. The app proxies requests through `POST /api/gemma`, and the Blockly `gemma` block uses that route at runtime.

### Simulation Backend

```bash
cd simulation
pip install -r requirements.txt
uvicorn api.main:app --port 8000
```

Accepts Blockly block chains via `POST /simulate`, runs them through the MarsSimulator (URDF + IK + FCL collision), and returns a Rerun session for 3D visualization in the browser.

### Vision Server

```bash
cd vision
pip install -r requirements.txt
uvicorn server:app --port 8910
```

Runs OWLv2 open-vocabulary object detection on the robot's camera feed. Endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/find` | POST | Set a text detection prompt (e.g. "red cup") |
| `/status` | GET | Latest detection result (angle, distance, confidence) |
| `/clear` | POST | Stop detection |
| `/health` | GET | Health check |

## Project Structure

```
app/                          # Next.js pages & API routes
├── page.tsx                  # Landing page
├── learn/                    # Curriculum index + dynamic lesson pages
├── dashboard/                # Student progress dashboard
├── settings/                 # Profile settings (stub)
└── api/
    ├── gemma/route.ts        # Gemma/Ollama LLM proxy (streaming)
    └── progress/route.ts     # Lesson progress persistence

components/
├── course/
│   └── lesson-viewer.tsx     # Two-step lesson UI (Learn → Exercise)
├── exercise/
│   ├── blockly-workspace.tsx # Full IDE: editor, console, camera, sim viewer
│   ├── mars-connect-exercise.tsx  # Simple connect-and-act exercises
│   ├── mars-chat.tsx         # Gemma chat interface
│   ├── robot-console.tsx     # Color-coded execution log viewer
│   ├── rerun-viewer.tsx      # Embedded Rerun 3D simulation viewer
│   ├── camera-feed-widget.tsx # Live robot camera stream
│   └── connect-dialog.tsx    # Robot WebSocket connection modal
└── layout/                   # App shell, header, footer

lib/
├── blocks/                   # Blockly block definitions (~1,400 lines)
│   ├── movement.ts           # move, turn, drive, stop, set speed
│   ├── arm.ts                # arm home, IK move, gripper, wave, pick up
│   ├── sensors.ts            # distance, camera, tags, battery, heading
│   ├── speech.ts             # TTS, listen, volume, sounds
│   ├── lights.ts             # LED color, patterns
│   ├── head.ts               # head tilt, emotions
│   ├── navigation.ts         # navigate, spin, save/go to positions
│   ├── wait.ts               # wait, forever, repeat, conditions, skills
│   ├── chat.ts               # chat ask, gemma ask
│   └── vision.ts             # OWLv2 find, detected, angle, distance
├── generators/python/        # Blockly → Python code generators
├── blockly-config/
│   └── toolbox.ts            # Block category menu configuration
├── robot/
│   ├── connection.ts         # WebSocket connection to MARS via roslib
│   ├── executor.ts           # Block tree walker + robot command execution
│   ├── use-robot.ts          # React hook for robot state management
│   └── simulation-client.ts  # Client for Python simulation backend
├── course-data.ts            # Full curriculum definition (7 chapters + showcase)
├── content.ts                # MDX lesson loader
├── mdx.tsx                   # MDX renderer with syntax highlighting
├── mdx-components.tsx        # Custom MDX components (Callout, etc.)
├── unlocks.ts                # Lesson unlock/progress logic
├── mock-progress.ts          # Demo progress data
└── store/
    └── lesson-store.ts       # Zustand store (lesson state, workspace XML)

content/lessons/              # MDX lesson files

simulation/
├── api/main.py               # FastAPI simulation server
├── core/
│   ├── mars_sim.py           # MarsSimulator (Rerun + IK + collision)
│   ├── collision.py          # FCL mesh-based collision detection
│   ├── kinematics.py         # Forward/inverse kinematics helpers
│   ├── linear_planner.py     # Simple path planning
│   └── planner_interface.py  # Abstract planner interface
├── models/
│   ├── mars_robot.urdf       # Full MARS robot description
│   ├── meshes/               # STL meshes for robot links
│   └── collision_pairs.json  # Collision pair definitions
└── simplify_collisions.py    # Collision mesh simplification

vision/
├── server.py                 # FastAPI vision server (port 8910)
├── detector.py               # OWLv2 object detection (MPS accelerated)
└── camera_bridge.py          # Async WebSocket camera subscriber

ros2/
├── velocity_heading_controller.py   # Heading PI controller for diff drive
├── rotate_delta_controller.py       # Relative rotation controller
├── heading_pi_controller.py         # PID heading control
├── image_throttle.py                # Camera frame rate throttler
├── compressed_to_raw.py             # Image format conversion
├── arm_apriltag_cube.launch.py      # AprilTag detection launch
├── left_aruco_cube.launch.py        # ArUco detection launch
├── arm_camera_info_publisher.py     # Camera calibration publisher
├── cube_pose_fuser.py               # Multi-camera detection fusion
└── aruco_annotator.py               # Tag annotation overlay
```

## Curriculum

| # | Chapter | Lessons |
|---|---|---|
| 1 | **Foundations** | Connecting to MARS, What is a Robot?, First Skill Call |
| 2 | **Sensing** | Camera, Depth, LiDAR, Gripper Camera, Speech, Sensor Fusion |
| 3 | **Acting** | Navigation, Obstacle Avoidance, Arm, IK, Teach by Demo, Grasping |
| 4 | **Maps & SLAM** | Maps, SLAM, Localization, Path Planning, Spatial Memory |
| 5 | **Deciding** | State Machines, Rules, Language as Controller, Multi-skill, Error Handling |
| 6 | **AI & Learning** | Vision Models, Training from Demos, VLA, Edge AI, Generalization |
| 7 | **Capstone** | Define Project, Build & Train, Debug, Demo Day |
| 8 | **Showcase** | Navigate to Tag, Pick It Up, Place It Higher |

**Exercise types:**
- **Blockly** — Drag-and-drop visual programming with live Python preview
- **Mars-Connect** — Connect to the robot and execute a single action

## Robot Connection

The frontend connects to the MARS robot over WebSocket via rosbridge (default `ws://mars-the-blue.local:9090`). The connection URL is configurable in the connect dialog.

**Supported ROS2 topics/services:**

| Topic/Service | Purpose |
|---|---|
| `cmd_vel` | Velocity commands |
| `/mars/drive_heading` | Drive with heading control |
| `/mars/rotate_delta` | Relative rotation |
| `/mars/arm/goto_js` | Arm joint space goals |
| `/mars/arm/state` | Joint state subscription (10Hz) |
| `/mars/arm/status` | Arm status (e-stop, faults) |
| `/mars/head/set_position` | Head tilt |
| `/light_command` | LED color/pattern |
| `/brain/tts` | Text-to-speech |
| `/brain/chat_in` | Chat input |
| `/input_manager/active_inputs` | Microphone enable |

## Block Execution Flow

1. Student builds a program in the Blockly workspace
2. `BlockExecutor` serializes the workspace to a block tree
3. Executor recursively walks the tree, evaluating values and control flow
4. Each robot action block calls the corresponding `RobotConnection` method
5. `RobotConnection` publishes to ROS2 topics / calls services via roslib WebSocket
6. The robot executes the command; sensor data flows back via subscriptions
7. All actions are logged to the robot console in real-time

## Student Workflow

1. Visit `/learn` and pick a chapter and lesson
2. Read the lesson content (MDX) in the **Learn** tab
3. Switch to the **Exercise** tab to open the Blockly workspace
4. Drag-and-drop robot blocks; see the generated Python in the preview pane
5. Connect to the MARS robot via the connection dialog
6. Click **Run** to execute the program on the robot
7. Watch the robot act and monitor logs in the console
8. Optionally view the 3D simulation in the embedded Rerun viewer
9. Complete the exercise and move to the next lesson
