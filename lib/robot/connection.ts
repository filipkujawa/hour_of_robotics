import { DEFAULT_ROBOT_URL } from "./constants";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RobotConnectionOptions {
  url?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
  onLog?: (message: string) => void;
}

// Lazy-loaded ROSLIB module (client-only)
let ROSLIB: typeof import("roslib") | null = null;

async function getRoslib() {
  if (!ROSLIB) {
    ROSLIB = await import("roslib");
  }
  return ROSLIB;
}

export class RobotConnection {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ros: any = null;
  private url: string;
  private onStatusChange: (status: ConnectionStatus) => void;
  private onError: (error: string) => void;
  private onLog: (message: string) => void;
  private _status: ConnectionStatus = "disconnected";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cmdVelTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private lightService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private headTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ttsTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chatInTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armTorqueOffService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armTorqueOnService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armStateTopic: any = null;
  private lastArmJoints: number[] | null = null;

  constructor(options: RobotConnectionOptions = {}) {
    this.url = options.url || DEFAULT_ROBOT_URL;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onLog = options.onLog || (() => {});
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.onStatusChange(status);
  }

  async connect(): Promise<void> {
    const roslib = await getRoslib();

    this.setStatus("connecting");
    this.onLog(`Connecting to ${this.url}...`);

    return new Promise((resolve, reject) => {
      this.ros = new roslib.Ros({ url: this.url });

      this.ros.on("connection", () => {
        this.setStatus("connected");
        this.onLog("Connected to Mars robot");
        this.initTopicsAndServices(roslib);
        resolve();
      });

      this.ros.on("error", (error: Error) => {
        this.setStatus("error");
        this.onError(`Connection error: ${error.message || "Could not reach robot"}`);
        reject(error);
      });

      this.ros.on("close", () => {
        this.setStatus("disconnected");
        this.onLog("Disconnected from Mars robot");
        this.cleanup();
      });
    });
  }

  disconnect() {
    if (this.ros) {
      this.ros.close();
      this.cleanup();
    }
  }

  private cleanup() {
    this.cmdVelTopic = null;
    this.armService = null;
    this.lightService = null;
    this.headTopic = null;
    this.ttsTopic = null;
    this.chatInTopic = null;
    this.armTorqueOffService = null;
    this.armTorqueOnService = null;
    this.armStateTopic = null;
    this.lastArmJoints = null;
  }

  private initTopicsAndServices(roslib: typeof import("roslib")) {
    if (!this.ros) return;

    this.cmdVelTopic = new roslib.Topic({
      ros: this.ros,
      name: "/cmd_vel",
      messageType: "geometry_msgs/Twist",
    });

    this.armService = new roslib.Service({
      ros: this.ros,
      name: "/mars/arm/goto_js",
      serviceType: "maurice_msgs/GotoJS",
    });

    this.armStateTopic = new roslib.Topic({
      ros: this.ros,
      name: "/mars/arm/state",
      messageType: "sensor_msgs/JointState",
    });

    this.armStateTopic.subscribe((message: { position?: number[] }) => {
      if (Array.isArray(message?.position)) {
        this.lastArmJoints = message.position.slice(0, 6);
      }
    });

    this.headTopic = new roslib.Topic({
      ros: this.ros,
      name: "/mars/head/set_position",
      messageType: "std_msgs/Int32",
    });

    this.lightService = new roslib.Service({
      ros: this.ros,
      name: "/light_command",
      serviceType: "maurice_msgs/LightCommand",
    });

    this.ttsTopic = new roslib.Topic({
      ros: this.ros,
      name: "/brain/tts",
      messageType: "std_msgs/String",
    });

    this.chatInTopic = new roslib.Topic({
      ros: this.ros,
      name: "/brain/chat_in",
      messageType: "std_msgs/String",
    });

    this.armTorqueOffService = new roslib.Service({
      ros: this.ros,
      name: "/mars/arm/torque_off",
      serviceType: "std_srvs/Trigger",
    });

    this.armTorqueOnService = new roslib.Service({
      ros: this.ros,
      name: "/mars/arm/torque_on",
      serviceType: "std_srvs/Trigger",
    });
  }

  // ==========================================
  // Movement
  // ==========================================

  publishVelocity(linear: number, angular: number) {
    if (!this.cmdVelTopic) {
      this.onError("Not connected");
      return;
    }

    this.cmdVelTopic.publish({
      linear: { x: linear, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angular },
    });
  }

  async moveForward(steps: number): Promise<void> {
    const speed = 0.2;
    const duration = steps * 0.5;
    this.onLog(`Moving forward ${steps} steps`);
    this.publishVelocity(speed, 0);
    await this.sleep(duration * 1000);
    this.publishVelocity(0, 0);
  }

  async moveBackward(steps: number): Promise<void> {
    const speed = -0.2;
    const duration = steps * 0.5;
    this.onLog(`Moving backward ${steps} steps`);
    this.publishVelocity(speed, 0);
    await this.sleep(duration * 1000);
    this.publishVelocity(0, 0);
  }

  async turn(direction: string, degrees: number): Promise<void> {
    const angularSpeed = direction === "LEFT" ? 0.5 : -0.5;
    const duration = (degrees / 90) * 1.57;
    this.onLog(`Turning ${direction.toLowerCase()} ${degrees}deg`);
    this.publishVelocity(0, angularSpeed);
    await this.sleep(duration * 1000);
    this.publishVelocity(0, 0);
  }

  stop() {
    this.onLog("Stopping");
    this.publishVelocity(0, 0);
  }

  // ==========================================
  // Arm & Gripper
  // ==========================================

  async armGoToJoints(joints: number[], durationSeconds = 2.0): Promise<void> {
    if (!this.armService) return;

    const jointTargets = joints.length > 6 ? joints.slice(0, 6) : joints;
    if (jointTargets.length !== 6) {
      this.onError(`Arm expected 6 joints, got ${jointTargets.length}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.armService.callService(
        { data: { data: jointTargets }, time: durationSeconds },
        () => { this.onLog("Arm moved"); resolve(); },
        (err: string) => { this.onError(`Arm error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async armHome(): Promise<void> {
    this.onLog("Arm -> home");
    return this.armGoToJoints(
      [
        1.5876701154616386,
        -1.5968740001889525,
        1.6152817696435802,
        0.8927768185494431,
        -0.035281558121369745,
        0.010737865515199488,
      ],
      2.0
    );
  }

  async wave(): Promise<void> {
    this.onLog("Waving!");
    return this.executeSkill("innate-os/wave", {});
  }

  async gripperOpen(): Promise<void> {
    this.onLog("Gripper open");
    if (!this.lastArmJoints) {
      this.onError("No arm state yet; cannot open gripper");
      return;
    }
    const joints = [...this.lastArmJoints];
    joints[5] = 0.85; // GRIPPER_OPEN from manipulation_interface
    return this.armGoToJoints(joints, 0.5);
  }

  async gripperClose(): Promise<void> {
    this.onLog("Gripper close");
    if (!this.lastArmJoints) {
      this.onError("No arm state yet; cannot close gripper");
      return;
    }
    const joints = [...this.lastArmJoints];
    joints[5] = 0.0; // GRIPPER_CLOSED from manipulation_interface
    return this.armGoToJoints(joints, 0.5);
  }

  async pickUp(): Promise<void> {
    this.onLog("Picking up");
    return this.executeSkill("innate-os/pick_up_piece_simple", {});
  }

  // ==========================================
  // Speech
  // ==========================================

  async say(text: string): Promise<void> {
    this.onLog(`Say: "${text}"`);
    if (this.ttsTopic) {
      this.ttsTopic.publish({ data: text });
      return;
    }
    return this.executeSkill("innate-os/speak", { text });
  }

  async setVolume(percent: number): Promise<void> {
    if (!this.ros) return;
    const roslib = await getRoslib();
    const clamped = Math.max(0, Math.min(100, percent));
    this.onLog(`Volume -> ${clamped}%`);

    const service = new roslib.Service({
      ros: this.ros,
      name: "/set_volume",
      serviceType: "std_srvs/SetBool",
    });

    return new Promise((resolve, reject) => {
      service.callService(
        { data: clamped },
        () => resolve(),
        (err: string) => { this.onError(`Volume error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  // ==========================================
  // Lights
  // ==========================================

  async setLedColor(hexColor: string): Promise<void> {
    if (!this.lightService) return;

    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    return new Promise((resolve, reject) => {
      this.lightService.callService(
        { mode: "solid", interval: 0, r, g, b },
        () => { this.onLog(`LEDs -> ${hexColor}`); resolve(); },
        (err: string) => { this.onError(`LED error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async setLedPattern(pattern: string): Promise<void> {
    if (!this.lightService) return;

    return new Promise((resolve, reject) => {
      this.lightService.callService(
        { mode: pattern.toLowerCase(), interval: 500, r: 255, g: 100, b: 50 },
        () => { this.onLog(`LED pattern: ${pattern}`); resolve(); },
        (err: string) => { this.onError(`LED error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async ledsOff(): Promise<void> {
    return this.setLedColor("#000000");
  }

  // ==========================================
  // Navigation
  // ==========================================

  async navigateTo(x: number, y: number): Promise<void> {
    if (!this.ros) {
      this.onError("Not connected");
      return;
    }

    const roslib = await getRoslib();
    this.onLog(`Navigating to (${x}, ${y})...`);

    return new Promise((resolve, reject) => {
      const actionClient = new roslib.ActionClient({
        ros: this.ros,
        serverName: "/navigate_to_pose",
        actionName: "nav2_msgs/NavigateToPose",
      });

      const goal = new roslib.Goal({
        actionClient,
        goalMessage: {
          pose: {
            header: { frame_id: "map" },
            pose: {
              position: { x, y, z: 0.0 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          },
        },
      });

      goal.on("result", () => {
        this.onLog(`Arrived at (${x}, ${y})`);
        resolve();
      });

      goal.on("timeout", () => {
        this.onError("Navigation timed out");
        reject(new Error("timeout"));
      });

      goal.send();
    });
  }

  async spinInPlace(degrees: number): Promise<void> {
    if (!this.ros) {
      this.onError("Not connected");
      return;
    }

    const roslib = await getRoslib();
    const radians = (degrees * Math.PI) / 180;
    this.onLog(`Spinning ${degrees} degrees...`);

    return new Promise((resolve, reject) => {
      const actionClient = new roslib.ActionClient({
        ros: this.ros,
        serverName: "/spin",
        actionName: "nav2_msgs/Spin",
      });

      const goal = new roslib.Goal({
        actionClient,
        goalMessage: { target_yaw: radians },
      });

      goal.on("result", () => {
        this.onLog("Spin complete");
        resolve();
      });

      goal.on("timeout", () => {
        this.onError("Spin timed out");
        reject(new Error("timeout"));
      });

      goal.send();
    });
  }

  // ==========================================
  // AI / Chat
  // ==========================================

  async chatAsk(message: string): Promise<string> {
    if (!this.ros || !this.chatInTopic) return "";
    const roslib = await getRoslib();
    this.onLog(`Asking AI: "${message}"`);

    return new Promise((resolve) => {
      const chatOutTopic = new roslib.Topic({
        ros: this.ros,
        name: "/brain/chat_out",
        messageType: "std_msgs/String",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (msg: any) => {
        chatOutTopic.unsubscribe();
        const response = msg.data as string;
        this.onLog(`AI response: "${response}"`);
        resolve(response);
      };

      chatOutTopic.subscribe(handler);
      this.chatInTopic.publish({ data: message });

      // Timeout after 15 seconds
      setTimeout(() => {
        chatOutTopic.unsubscribe();
        resolve("");
      }, 15000);
    });
  }

  chatSay(text: string) {
    if (!this.ttsTopic) {
      this.onError("Not connected");
      return;
    }

    this.onLog(`TTS: "${text}"`);
    this.ttsTopic.publish({ data: text });
  }

  // ==========================================
  // Head
  // ==========================================

  setHeadTilt(degrees: number) {
    if (!this.headTopic) {
      this.onError("Not connected");
      return;
    }

    // Clamp to innate-os range: -25 (down) to +15 (up)
    const clamped = Math.max(-25, Math.min(15, degrees));
    this.headTiltRad = (clamped * Math.PI) / 180;
    this.onLog(`Head tilt -> ${clamped}°`);
    this.headTopic.publish({ data: clamped });
  }

  // ==========================================
  // Sensors
  // ==========================================

  async getDistance(): Promise<number> {
    if (!this.ros) return -1;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/scan",
        messageType: "sensor_msgs/LaserScan",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        const validRanges = (message.ranges as number[]).filter(
          (r: number) => r > 0.01 && r < 6.0
        );
        const minDist = validRanges.length > 0 ? Math.min(...validRanges) : -1;
        resolve(Math.round(minDist * 100));
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve(-1); }, 2000);
    });
  }

  async getBattery(): Promise<number> {
    if (!this.ros) return -1;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/battery_state",
        messageType: "sensor_msgs/BatteryState",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        const pct = Math.round((message.percentage ?? 0) * 100);
        resolve(pct);
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve(-1); }, 2000);
    });
  }

  async getHeading(): Promise<number> {
    if (!this.ros) return -1;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/odom",
        messageType: "nav_msgs/Odometry",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        const q = message.pose.pose.orientation;
        const siny = 2.0 * (q.w * q.z + q.x * q.y);
        const cosy = 1.0 - 2.0 * (q.y * q.y + q.z * q.z);
        let yaw = Math.atan2(siny, cosy) * (180 / Math.PI);
        if (yaw < 0) yaw += 360;
        resolve(Math.round(yaw));
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve(-1); }, 2000);
    });
  }

  // ==========================================
  // Tag Detection (ArUco / AprilTag)
  // ==========================================

  async getTagPoseArm(axis: string): Promise<number> {
    if (!this.ros) return 0;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco/cube_pose",
        messageType: "geometry_msgs/PoseStamped",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        const pos = message.pose.position;
        const val = axis === "X" ? pos.x : axis === "Y" ? pos.y : pos.z;
        // NaN means no detection
        resolve(isNaN(val) ? 0 : Math.round(val * 1000) / 1000);
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve(0); }, 2000);
    });
  }

  // Current head tilt in radians (updated by setHeadTilt)
  private headTiltRad = 0;

  async getTagPoseHead(axis: string): Promise<number> {
    if (!this.ros) return 0;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco_left/cube_pose",
        messageType: "geometry_msgs/msg/PoseStamped",
      });

      let resolved = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        if (resolved) return;
        resolved = true;
        topic.unsubscribe();

        const pos = message?.pose?.position;
        if (!pos) { resolve(0); return; }

        // Tag is in camera optical frame: x=right, y=down, z=forward
        const cam_x = pos.x;
        const cam_y = pos.y;
        const cam_z = pos.z;

        // Camera is on the head which can tilt.
        // Head joint: parent=base_link, origin xyz=[-0.041, -0.0002, 0.259], axis=[0,-1,0]
        // Camera on head: xyz=[0.043, 0.030, -0.0003]
        // Optical frame: rotated -90 around X, -90 around Z from camera link

        // Head tilt angle (negative Y axis rotation)
        const tilt = this.headTiltRad;

        // Step 1: Camera optical → camera link (undo optical frame rotation)
        // optical: x=right, y=down, z=forward → link: x=forward, y=left, z=up
        const link_x = cam_z;   // optical z (forward) = link x
        const link_y = -cam_x;  // optical x (right) = link -y
        const link_z = -cam_y;  // optical y (down) = link -z

        // Step 2: Camera link → head link (add camera offset on head)
        const head_x = link_x + 0.043;
        const head_y = link_y + 0.030;
        const head_z = link_z - 0.0003;

        // Step 3: Head link → base_link (apply head tilt + head origin)
        // Head tilt rotates around -Y axis
        const cos_t = Math.cos(-tilt);
        const sin_t = Math.sin(-tilt);
        const base_x = cos_t * head_x + sin_t * head_z + (-0.041);
        const base_y = head_y + (-0.0002);
        const base_z = -sin_t * head_x + cos_t * head_z + 0.259;

        this.onLog(`Tag base_link: x=${base_x.toFixed(3)}, y=${base_y.toFixed(3)}, z=${base_z.toFixed(3)}`);

        const val = axis === "X" ? base_x : axis === "Y" ? base_y : base_z;
        resolve(isNaN(val) ? 0 : Math.round(val * 1000) / 1000);
      };

      topic.subscribe(handler);
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          topic.unsubscribe();
          this.onLog("Tag timeout — no message received");
          resolve(0);
        }
      }, 3000);
    });
  }

  async isTagDetected(): Promise<boolean> {
    if (!this.ros) return false;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco/cube_faces",
        messageType: "std_msgs/String",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        // CSV of visible tag IDs — empty string means no detection
        resolve(typeof message.data === "string" && message.data.trim().length > 0);
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve(false); }, 2000);
    });
  }

  async getAvailableSkills(): Promise<string[]> {
    if (!this.ros) return [];
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/brain/available_skills",
        messageType: "std_msgs/String",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        topic.unsubscribe();
        try {
          const skills = JSON.parse(message.data);
          resolve(Array.isArray(skills) ? skills : []);
        } catch {
          resolve([]);
        }
      };

      topic.subscribe(handler);
      setTimeout(() => { topic.unsubscribe(); resolve([]); }, 3000);
    });
  }

  // ==========================================
  // Arm (torque)
  // ==========================================

  async armTorqueOff(): Promise<void> {
    if (!this.armTorqueOffService) return;

    return new Promise((resolve, reject) => {
      this.armTorqueOffService.callService(
        {},
        () => { this.onLog("Arm torque OFF — freedrive enabled"); resolve(); },
        (err: string) => { this.onError(`Torque off error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async armTorqueOn(): Promise<void> {
    if (!this.armTorqueOnService) return;

    return new Promise((resolve, reject) => {
      this.armTorqueOnService.callService(
        {},
        () => { this.onLog("Arm torque ON — holding position"); resolve(); },
        (err: string) => { this.onError(`Torque on error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  // ==========================================
  // Generic skill execution
  // ==========================================

  async executeSkill(skillName: string, parameters: Record<string, unknown>): Promise<void> {
    if (!this.ros) {
      this.onError("Not connected");
      return;
    }

    // Ensure all number values serialize as floats (e.g. 0 → 0.0)
    // The robot's skill server requires float types, not int
    const floatParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parameters)) {
      floatParams[k] = typeof v === "number" ? parseFloat(v.toFixed(6)) : v;
    }
    const inputsJson = JSON.stringify(floatParams).replace(
      /":(\d+)([,}])/g,
      '":$1.0$2'
    );
    this.onLog(`Sending skill "${skillName}" with inputs ${inputsJson}`);

    // Use rosbridge's send_action_goal operation directly via callOnConnection
    // instead of roslib's ActionClient (which uses the ROS1 action protocol
    // and can't handle ROS2 action types like brain_messages/action/ExecuteSkill)
    return new Promise((resolve, reject) => {
      const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const timeout = setTimeout(() => {
        this.ros.off(id, undefined);
        this.onError(`Skill "${skillName}" timed out`);
        reject(new Error("timeout"));
      }, 60000);

      // Listen for result/feedback via roslib's event system
      this.ros.on(id, (msg: { values?: { result?: { success: boolean; message?: string }; feedback?: string } }) => {
        if (msg.values?.result) {
          clearTimeout(timeout);
          this.ros.off(id, undefined);
          if (msg.values.result.success === false) {
            const errMsg = msg.values.result.message || "Skill reported failure";
            this.onError(`Skill "${skillName}" failed: ${errMsg}`);
            reject(new Error(errMsg));
          } else {
            this.onLog(`Skill "${skillName}" done`);
            resolve();
          }
        } else if (msg.values?.feedback) {
          this.onLog(`Skill "${skillName}" feedback: ${msg.values.feedback}`);
        }
      });

      this.ros.callOnConnection({
        op: "send_action_goal",
        id: id,
        action: "/execute_skill",
        action_type: "brain_messages/action/ExecuteSkill",
        args: {
          skill_type: skillName,
          inputs: inputsJson,
        },
        feedback: true,
      });
      this.onLog("Action goal sent");
    });
  }

  // ==========================================
  // Utility
  // ==========================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
