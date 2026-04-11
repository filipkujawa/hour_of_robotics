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

  constructor(options: RobotConnectionOptions = {}) {
    this.url = options.url || "ws://mars.local:9090";
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

  async armGoToJoints(joints: number[]): Promise<void> {
    if (!this.armService) return;

    const jointTargets = joints.length > 6 ? joints.slice(0, 6) : joints;
    if (jointTargets.length !== 6) {
      this.onError(`Arm expected 6 joints, got ${jointTargets.length}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.armService.callService(
        { data: { data: jointTargets }, time: 2.0 },
        () => { this.onLog("Arm moved"); resolve(); },
        (err: string) => { this.onError(`Arm error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async armHome(): Promise<void> {
    this.onLog("Arm -> home");
    return this.executeSkill("innate-os/arm_zero_position", { duration: 2000 });
  }

  async wave(): Promise<void> {
    this.onLog("Waving!");
    return this.executeSkill("head_emotion", { emotion: "excited" });
  }

  async gripperOpen(): Promise<void> {
    this.onLog("Gripper open");
    return this.executeSkill("open_gripper", {});
  }

  async gripperClose(): Promise<void> {
    this.onLog("Gripper close");
    return this.executeSkill("close_gripper", {});
  }

  async pickUp(): Promise<void> {
    this.onLog("Picking up");
    return this.executeSkill("pick_up_piece_simple", {});
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
    return this.executeSkill("speak", { text });
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

    const roslib = await getRoslib();
    const inputsJson = JSON.stringify(parameters);
    this.onLog(`Sending skill "${skillName}" with inputs ${inputsJson}`);

    return new Promise((resolve, reject) => {
      const actionClient = new roslib.ActionClient({
        ros: this.ros,
        serverName: "/execute_skill",
        actionName: "brain_messages/ExecuteSkill",
      });

      const goal = new roslib.Goal({
        actionClient,
        goalMessage: {
          skill_type: skillName,
          inputs: inputsJson,
        },
      });

      goal.on("feedback", (feedback: unknown) => {
        this.onLog(`Skill "${skillName}" feedback: ${JSON.stringify(feedback)}`);
      });

      goal.on("result", (result: unknown) => {
        this.onLog(`Skill "${skillName}" result: ${JSON.stringify(result)}`);
        // Attempt to detect failure in common result shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = (result as any)?.result ?? result;
        if (res && res.success === false) {
          const msg = res.message || "Skill reported failure";
          this.onError(`Skill "${skillName}" failed: ${msg}`);
          reject(new Error(String(msg)));
          return;
        }
        this.onLog(`Skill "${skillName}" done`);
        resolve();
      });

      goal.on("timeout", () => {
        this.onError(`Skill "${skillName}" timed out`);
        reject(new Error("timeout"));
      });

      goal.send();
    });
  }

  // ==========================================
  // Utility
  // ==========================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
