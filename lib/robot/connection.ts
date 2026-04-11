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
  private ttsTopic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private headTopic: any = null;

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
      name: "/mars/arm/goto_js_v2",
      serviceType: "maurice_msgs/GotoJSV2",
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

    return new Promise((resolve, reject) => {
      this.armService.callService(
        { joint_positions: joints, duration: 2.0 },
        () => { this.onLog("Arm moved"); resolve(); },
        (err: string) => { this.onError(`Arm error: ${err}`); reject(new Error(err)); }
      );
    });
  }

  async armHome(): Promise<void> {
    this.onLog("Arm -> home");
    return this.executeSkill("arm_zero_position", {});
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

  // ==========================================
  // Generic skill execution
  // ==========================================

  async executeSkill(skillName: string, parameters: Record<string, unknown>): Promise<void> {
    if (!this.ros) {
      this.onError("Not connected");
      return;
    }

    const roslib = await getRoslib();

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
          inputs: JSON.stringify(parameters),
        },
      });

      goal.on("result", () => {
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
