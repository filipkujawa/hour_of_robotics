import { DEFAULT_ROBOT_URL } from "./constants";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RobotConnectionOptions {
  url?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
  onLog?: (message: string) => void;
  onArmEstopChange?: (estopped: boolean | null) => void;
  /** `std_msgs/Float64MultiArray` [linear_m_s, duration_s] — same as `velocity_heading_controller` default */
  driveHeadingCmdTopic?: string;
  /** `std_msgs/Float64` delta heading in radians — same as `rotate_delta_controller` default */
  rotateDeltaCmdTopic?: string;
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
  private onArmEstopChange: (estopped: boolean | null) => void;
  private _status: ConnectionStatus = "disconnected";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cmdVelTopic: any = null;
  /** Forward/back timed segments: Float64MultiArray [linear_m_s, duration_s] */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private driveHeadingCmdTopic: any = null;
  private readonly driveHeadingCmdTopicName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rotateDeltaCmdTopic: any = null;
  private readonly rotateDeltaCmdTopicName: string;
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
  private armRebootService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armStateTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private armStatusTopic: any = null;
  private lastArmJoints: number[] | null = null;
  private lastArmEstop: boolean | null = null;
  private armTorqueOffRequestedForEstop = false;
  private armStateLastUpdate = 0;

  // Timestamps of last successful ArUco detection (for isTagDetected cache)
  private arucoHeadLastUpdate = 0;
  private arucoArmLastUpdate = 0;

  constructor(options: RobotConnectionOptions = {}) {
    this.url = options.url || DEFAULT_ROBOT_URL;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onLog = options.onLog || (() => {});
    this.onArmEstopChange = options.onArmEstopChange || (() => {});
    this.driveHeadingCmdTopicName = options.driveHeadingCmdTopic ?? "/mars/drive_heading";
    this.rotateDeltaCmdTopicName = options.rotateDeltaCmdTopic ?? "/mars/rotate_delta";
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
        const msg = error.message || "Could not reach robot";
        // Malformed JSON from rosbridge (e.g. ArUco NaN poses) — don't kill the connection
        if (msg.includes("Unexpected token") || msg.includes("not valid JSON")) {
          // Silently ignore — the websocket is still alive, just a bad message
          return;
        }
        this.setStatus("error");
        this.onError(`Connection error: ${msg}`);
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
    this.driveHeadingCmdTopic = null;
    this.rotateDeltaCmdTopic = null;
    this.armService = null;
    this.lightService = null;
    this.headTopic = null;
    this.ttsTopic = null;
    this.chatInTopic = null;
    this.armTorqueOffService = null;
    this.armTorqueOnService = null;
    this.armRebootService = null;
    this.armStateTopic = null;
    this.armStatusTopic = null;
    this.lastArmJoints = null;
    this.lastArmEstop = null;
    this.armTorqueOffRequestedForEstop = false;
  }

  private initTopicsAndServices(roslib: typeof import("roslib")) {
    if (!this.ros) return;

    this.cmdVelTopic = new roslib.Topic({
      ros: this.ros,
      name: "/cmd_vel",
      messageType: "geometry_msgs/Twist",
    });

    this.driveHeadingCmdTopic = new roslib.Topic({
      ros: this.ros,
      name: this.driveHeadingCmdTopicName,
      messageType: "std_msgs/Float64MultiArray",
    });

    this.rotateDeltaCmdTopic = new roslib.Topic({
      ros: this.ros,
      name: this.rotateDeltaCmdTopicName,
      messageType: "std_msgs/Float64",
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
      // Throttle to 10Hz — arm state publishes at 50-100Hz which floods the websocket
      // We only need fresh joints for FK when computing arm camera tag transforms
      const now = Date.now();
      if (now - this.armStateLastUpdate < 100) return;
      this.armStateLastUpdate = now;
      if (Array.isArray(message?.position)) {
        this.lastArmJoints = message.position.slice(0, 6);
      }
    });

    this.armStatusTopic = new roslib.Topic({
      ros: this.ros,
      name: "/mars/arm/status",
      messageType: "maurice_msgs/ArmStatus",
    });

    this.armStatusTopic.subscribe((message: Record<string, unknown>) => {
      this.handleArmStatus(message);
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

    this.armRebootService = new roslib.Service({
      ros: this.ros,
      name: "/mars/arm/reboot",
      serviceType: "std_srvs/Trigger",
    });

    // ArUco topics are NOT subscribed persistently — only on-demand during tag reads.
    // Persistent subscriptions crash the websocket when rosbridge serializes malformed
    // PoseStamped messages with NaN/empty position fields (invalid JSON).
  }

  private parseArmEstop(message: Record<string, unknown>): boolean | null {
    if (typeof message.estop === "boolean") return message.estop;
    if (typeof message.estopped === "boolean") return message.estopped;

    const data = (message as { data?: unknown }).data;
    if (typeof data === "boolean") return data;
    if (typeof data === "number") return data !== 0;
    if (typeof data === "string") {
      const s = data.toLowerCase();
      if (s.includes("estop") || s.includes("e-stop")) {
        if (s.includes("true") || s.includes("on") || s.includes("engaged") || s.includes("1")) return true;
        if (s.includes("false") || s.includes("off") || s.includes("released") || s.includes("0")) return false;
      }
    }

    return null;
  }

  private handleArmStatus(message: Record<string, unknown>) {
    const isOk = typeof message.is_ok === "boolean" ? message.is_ok : null;
    const error = typeof message.error === "string" ? message.error : "";

    if (isOk === null) return;

    this.handleArmEstopUpdate(!isOk);

    if (!isOk && error) {
      this.onError(`Arm status fault: ${error}`);
    }
  }

  private handleArmEstopUpdate(estopped: boolean | null) {
    if (estopped === null) return;
    if (estopped === this.lastArmEstop) return;

    this.lastArmEstop = estopped;
    this.onArmEstopChange(estopped);

    if (estopped) {
      this.onError("Arm estop engaged");
      if (!this.armTorqueOffRequestedForEstop) {
        this.armTorqueOffRequestedForEstop = true;
        void this.armTorqueOff(true).catch(() => {
          this.armTorqueOffRequestedForEstop = false;
        });
      }
      return;
    }

    this.armTorqueOffRequestedForEstop = false;
    this.onLog("Arm estop released");
  }

  // ==========================================
  // Movement
  // ==========================================

  publishVelocity(linear: number, angular: number) {
    if (!this.cmdVelTopic) {
      this.onError("Not connected");
      return;
    }
    let angular_offset = 0.15;
    if (angular == 0) {
      angular_offset = 0;
    }

    if (angular > 0) {
      angular_offset += 0.1;
    }

    this.cmdVelTopic.publish({
      linear: { x: linear, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angular + angular_offset },
    });
  }

  /** Timed straight-line segment while holding current yaw (same idea as cmd_vel + duration in one message). */
  private publishDriveHeading(linear: number, durationSec: number): void {
    if (!this.driveHeadingCmdTopic) {
      this.onError("Not connected");
      return;
    }
    this.driveHeadingCmdTopic.publish({
      layout: { dim: [], data_offset: 0 },
      data: [linear, durationSec],
    });
  }

  private cancelDriveHeadingSegment(): void {
    if (!this.driveHeadingCmdTopic) return;
    this.driveHeadingCmdTopic.publish({
      layout: { dim: [], data_offset: 0 },
      data: [0, 0],
    });
  }

  private publishRotateDelta(deltaThetaRad: number): void {
    if (!this.rotateDeltaCmdTopic) {
      this.onError("Not connected");
      return;
    }
    this.rotateDeltaCmdTopic.publish({ data: deltaThetaRad });
  }

  private cancelRotateDelta(): void {
    if (!this.rotateDeltaCmdTopic) return;
    this.rotateDeltaCmdTopic.publish({ data: 0 });
  }

  async moveForward(steps: number): Promise<void> {
    const speed = 0.2;
    const duration = steps * 0.5;
    this.onLog(`Moving forward ${steps} steps`);
    this.publishDriveHeading(speed, duration);
    await this.sleep(duration * 1000);
  }

  async moveBackward(steps: number): Promise<void> {
    const speed = -0.2;
    const duration = steps * 0.5;
    this.onLog(`Moving backward ${steps} steps`);
    this.publishDriveHeading(speed, duration);
    await this.sleep(duration * 1000);
  }

  async turn(direction: string, degrees: number): Promise<void> {
    this.cancelDriveHeadingSegment();
    this.cancelRotateDelta();
    const deltaThetaRad = (direction === "LEFT" ? 1 : -1) * (degrees * Math.PI / 180);
    const duration = Math.max(0.5, Math.abs(deltaThetaRad) / 0.9 + 0.6);
    this.onLog(`Turning ${direction.toLowerCase()} ${degrees}deg`);
    this.publishRotateDelta(deltaThetaRad);
    await this.sleep(duration * 1000);
    this.cancelRotateDelta();
  }

  stop() {
    this.onLog("Stopping");
    this.cancelDriveHeadingSegment();
    this.cancelRotateDelta();
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
    return this.armGoToJoints([
      1.6382914814618648,
      -1.894466273038767,
      1.5201749607946704,
      1.1305438406717176,
      -0.01227184630308513,
      0.04295146206079795,
    ], 2.0);
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

  async gemmaAsk(prompt: string): Promise<string> {
    this.onLog(`Asking Gemma: "${prompt}"`);

    try {
      const response = await fetch("/api/gemma", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = errorBody?.error || `Gemma request failed with status ${response.status}`;
        this.onError(message);
        return "";
      }

      if (!response.body) {
        this.onError("Gemma service did not return a response body");
        return "";
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      fullText += decoder.decode();
      const trimmed = fullText.trim();
      this.onLog(`Gemma response: "${trimmed}"`);
      return trimmed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemma error";
      this.onError(`Gemma request failed: ${message}`);
      return "";
    }
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

  // URDF joint origins and axes for FK computation (base_link → link5 → arm_camera)
  // Each entry: [parent, xyz, rpy, axis]
  private static ARM_CHAIN = [
    { xyz: [0.086, -0.05285, 0.04025], rpy: [0, 0, 0], axis: [0, 0, 1] },  // joint1
    { xyz: [0, 0, 0.04425], rpy: [0, 0, 0], axis: [0, 1, 0] },             // joint2
    { xyz: [0.02825, 0, 0.12125], rpy: [0, 0, 0], axis: [0, 1, 0] },       // joint3
    { xyz: [0.1375, 0, 0.0045], rpy: [0, 0, 0], axis: [0, 1, 0] },         // joint4
    { xyz: [0.019, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },               // joint5
  ];
  // Camera mount on link5
  private static ARM_CAM_OFFSET = { xyz: [0.03378, 0, 0.05052], rpy: [0, 0.43633, 0] };
  // Optical frame rotation: Z forward, X right, Y down
  private static OPT_FRAME_RPY = [-Math.PI / 2, 0, -Math.PI / 2];

  /**
   * Compute a 4x4 transform from xyz + rpy
   */
  private static tfMatrix(xyz: number[], rpy: number[]): number[][] {
    const [cr, sr] = [Math.cos(rpy[0]), Math.sin(rpy[0])];
    const [cp, sp] = [Math.cos(rpy[1]), Math.sin(rpy[1])];
    const [cy, sy] = [Math.cos(rpy[2]), Math.sin(rpy[2])];
    return [
      [cy*cp, cy*sp*sr - sy*cr, cy*sp*cr + sy*sr, xyz[0]],
      [sy*cp, sy*sp*sr + cy*cr, sy*sp*cr - cy*sr, xyz[1]],
      [-sp,   cp*sr,            cp*cr,             xyz[2]],
      [0,     0,                0,                 1],
    ];
  }

  /**
   * Rotation matrix for revolute joint about an axis
   */
  private static rotAxis(axis: number[], angle: number): number[][] {
    const [x, y, z] = axis;
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return [
      [t*x*x + c,   t*x*y - z*s, t*x*z + y*s, 0],
      [t*y*x + z*s, t*y*y + c,   t*y*z - x*s, 0],
      [t*z*x - y*s, t*z*y + x*s, t*z*z + c,   0],
      [0,           0,           0,            1],
    ];
  }

  /**
   * Multiply two 4x4 matrices
   */
  private static matMul(a: number[][], b: number[][]): number[][] {
    const r: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++)
          r[i][j] += a[i][k] * b[k][j];
    return r;
  }

  /**
   * Invert a 4x4 rigid transform (rotation + translation)
   */
  private static matInv(m: number[][]): number[][] {
    // For rigid transforms: R^-1 = R^T, t^-1 = -R^T * t
    const r: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,1]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        r[i][j] = m[j][i]; // transpose rotation
    for (let i = 0; i < 3; i++)
      r[i][3] = -(r[i][0]*m[0][3] + r[i][1]*m[1][3] + r[i][2]*m[2][3]);
    return r;
  }

  /**
   * Compute the arm camera's world-frame transform using current joint angles
   */
  private getArmCameraTransform(): number[][] {
    const joints = this.lastArmJoints ?? [0, 0, 0, 0, 0, 0];
    let T = RobotConnection.tfMatrix([0, 0, 0], [0, 0, 0]); // identity (base_link)

    // Walk the kinematic chain: joint1 → joint5
    for (let i = 0; i < RobotConnection.ARM_CHAIN.length; i++) {
      const j = RobotConnection.ARM_CHAIN[i];
      T = RobotConnection.matMul(T, RobotConnection.tfMatrix(j.xyz, j.rpy));
      T = RobotConnection.matMul(T, RobotConnection.rotAxis(j.axis, joints[i]));
    }

    // Camera offset on link5
    const cam = RobotConnection.ARM_CAM_OFFSET;
    T = RobotConnection.matMul(T, RobotConnection.tfMatrix(cam.xyz, cam.rpy));

    // Optical frame
    T = RobotConnection.matMul(T, RobotConnection.tfMatrix([0, 0, 0], RobotConnection.OPT_FRAME_RPY));

    return T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _processArmTag(message: any) {
    const pos = message?.pose?.position;
    if (!pos) return;

    const cam_x = pos.x, cam_y = pos.y, cam_z = pos.z;
    const T_cam = this.getArmCameraTransform();

    const bx = T_cam[0][0]*cam_x + T_cam[0][1]*cam_y + T_cam[0][2]*cam_z + T_cam[0][3];
    const by = T_cam[1][0]*cam_x + T_cam[1][1]*cam_y + T_cam[1][2]*cam_z + T_cam[1][3];
    const bz = T_cam[2][0]*cam_x + T_cam[2][1]*cam_y + T_cam[2][2]*cam_z + T_cam[2][3];

    // Shift origin from base_link center to arm base (front of robot)
    const wx = bx - 0.086;
    const wy = by + 0.053;
    const wz = bz;

    this.lastTagArm["X"] = Math.round(wx * 1000) / 1000;
    this.lastTagArm["Y"] = Math.round(wy * 1000) / 1000;
    this.lastTagArm["Z"] = Math.round(wz * 1000) / 1000;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _processHeadTag(message: any) {
    const pos = message?.pose?.position;
    if (!pos) return;

    const cam_x = pos.x, cam_y = pos.y, cam_z = pos.z;
    const tilt = this.headTiltRad;

    // Camera optical → camera link
    const link_x = cam_z, link_y = -cam_x, link_z = -cam_y;

    // Camera link → head link
    const head_x = link_x + 0.043;
    const head_y = link_y + 0.030;
    const head_z = link_z - 0.0003;

    // Head link → base_link (apply head tilt + head origin)
    const cos_t = Math.cos(-tilt);
    const sin_t = Math.sin(-tilt);
    const base_x = cos_t * head_x + sin_t * head_z + (-0.041);
    const base_y = head_y + (-0.0002);
    const base_z = -sin_t * head_x + cos_t * head_z + 0.259;

    // Shift origin from base_link center to arm base (front of robot)
    const front_x = base_x - 0.086;
    const front_y = base_y + 0.053;
    const front_z = base_z;

    this.lastTagHead["X"] = Math.round(front_x * 1000) / 1000;
    this.lastTagHead["Y"] = Math.round(front_y * 1000) / 1000;
    this.lastTagHead["Z"] = Math.round(front_z * 1000) / 1000;
  }

  /**
   * On-demand arm tag read. Subscribes, grabs one valid message, unsubscribes.
   * Falls back to cached value on timeout.
   */
  async getTagPoseArm(axis: string): Promise<number> {
    if (!this.ros) return this.lastTagArm[axis] ?? 0;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco/cube_pose",
        messageType: "geometry_msgs/PoseStamped",
      });

      let resolved = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topic.subscribe((message: any) => {
        if (resolved) return;
        try {
          const pos = message?.pose?.position;
          if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number" || typeof pos.z !== "number") return;
          if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) return;
          resolved = true;
          topic.unsubscribe();
          this._processArmTag(message);
          this.arucoArmLastUpdate = Date.now();
          this.onLog(`Arm tag (from arm base): ${axis}=${this.lastTagArm[axis]}`);
          resolve(this.lastTagArm[axis] ?? 0);
        } catch { /* drop malformed */ }
      });

      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try { topic.unsubscribe(); } catch { /* already closed */ }
        const last = this.lastTagArm[axis];
        if (last !== undefined) {
          this.onLog(`Arm tag timeout — using last known ${axis}=${last}`);
          resolve(last);
        } else {
          this.onLog("Arm tag timeout — no detection");
          resolve(0);
        }
      }, 2000);
    });
  }

  // Last known tag positions — cached across reads
  private lastTagHead: Record<string, number> = {};
  private lastTagArm: Record<string, number> = {};

  // Current head tilt in radians (updated by setHeadTilt)
  private headTiltRad = 0;

  /**
   * On-demand head tag read. Subscribes, grabs one valid message, unsubscribes.
   * Falls back to cached value on timeout.
   */
  async getTagPoseHead(axis: string): Promise<number> {
    if (!this.ros) return this.lastTagHead[axis] ?? 0;
    const roslib = await getRoslib();

    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco_left/cube_pose",
        messageType: "geometry_msgs/msg/PoseStamped",
      });

      let resolved = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topic.subscribe((message: any) => {
        if (resolved) return;
        try {
          const pos = message?.pose?.position;
          if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number" || typeof pos.z !== "number") return;
          if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) return;
          resolved = true;
          topic.unsubscribe();
          this._processHeadTag(message);
          this.arucoHeadLastUpdate = Date.now();
          this.onLog(`Tag (from arm base): ${axis}=${this.lastTagHead[axis]}`);
          resolve(this.lastTagHead[axis] ?? 0);
        } catch { /* drop malformed */ }
      });

      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try { topic.unsubscribe(); } catch { /* already closed */ }
        const last = this.lastTagHead[axis];
        if (last !== undefined) {
          this.onLog(`Tag timeout — using last known ${axis}=${last}`);
          resolve(last);
        } else {
          this.onLog("Tag timeout — no detection");
          resolve(0);
        }
      }, 3000);
    });
  }

  async isTagDetectedArm(): Promise<boolean> {
    if (Date.now() - this.arucoArmLastUpdate < 5000) return true;
    if (!this.ros) return false;
    const roslib = await getRoslib();
    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco/detected",
        messageType: "std_msgs/Bool",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        try { topic.unsubscribe(); } catch { /* */ }
        resolve(message.data === true);
      };
      topic.subscribe(handler);
      setTimeout(() => { try { topic.unsubscribe(); } catch { /* */ } resolve(false); }, 2000);
    });
  }

  async isTagDetectedHead(): Promise<boolean> {
    if (Date.now() - this.arucoHeadLastUpdate < 5000) return true;
    if (!this.ros) return false;
    const roslib = await getRoslib();
    return new Promise((resolve) => {
      const topic = new roslib.Topic({
        ros: this.ros,
        name: "/aruco_left/detected",
        messageType: "std_msgs/Bool",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (message: any) => {
        try { topic.unsubscribe(); } catch { /* */ }
        resolve(message.data === true);
      };
      topic.subscribe(handler);
      setTimeout(() => { try { topic.unsubscribe(); } catch { /* */ } resolve(false); }, 2000);
    });
  }

  async isTagDetected(): Promise<boolean> {
    const [arm, head] = await Promise.all([this.isTagDetectedArm(), this.isTagDetectedHead()]);
    return arm || head;
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

  async armTorqueOff(fromEstop = false): Promise<void> {
    if (!this.armTorqueOffService) return;

    return new Promise((resolve, reject) => {
      this.armTorqueOffService.callService(
        {},
        () => {
          this.onLog(fromEstop ? "Arm torque OFF due to estop" : "Arm torque OFF — freedrive enabled");
          resolve();
        },
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

  async armReboot(): Promise<void> {
    if (!this.armRebootService) return;

    return new Promise((resolve, reject) => {
      this.armRebootService.callService(
        {},
        () => { this.onLog("Arm reboot requested — clearing faults"); resolve(); },
        (err: string) => { this.onError(`Arm reboot error: ${err}`); reject(new Error(err)); }
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
        if (!settled) {
          settled = true;
          this.ros.off(id, undefined);
          if (wsHandler && socket) socket.removeEventListener("message", wsHandler);
          this.onError(`Skill "${skillName}" timed out`);
          reject(new Error("timeout"));
        }
      }, 60000);

      let settled = false;
      const settle = (success: boolean, errMsg?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (wsHandler && socket) socket.removeEventListener("message", wsHandler);
        if (success) {
          this.onLog(`Skill "${skillName}" done`);
          resolve();
        } else {
          this.onError(`Skill "${skillName}" failed: ${errMsg}`);
          reject(new Error(errMsg));
        }
      };

      // Listen via roslib event system (in case it routes by id)
      this.ros.on(id, (msg: { values?: { result?: { success: boolean; message?: string }; feedback?: string } }) => {
        if (msg.values?.result) {
          settle(msg.values.result.success !== false, msg.values.result.message);
        }
      });

      // Also listen on raw WebSocket — roslib may not route action_result by id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const socket = (this.ros as any).transport?.socket;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wsHandler = socket ? (event: any) => {
        try {
          const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
          if (msg.id !== id) return;
          if (msg.op === "action_result") {
            const result = msg.values ?? {};
            settle(result.success !== false && result.result?.success !== false, result.message || result.result?.message);
          } else if (msg.op === "action_feedback" && !settled) {
            this.onLog(`Skill feedback: ${JSON.stringify(msg.values?.feedback ?? msg.values).slice(0, 100)}`);
          }
        } catch { /* not our message */ }
      } : null;
      if (socket && wsHandler) socket.addEventListener("message", wsHandler);

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
