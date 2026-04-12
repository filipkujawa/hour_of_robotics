import { RobotConnection } from "./connection";

/**
 * Executes a Blockly workspace against a live Mars robot.
 *
 * Instead of generating Python and running it, we walk the block tree
 * and call ROS2 services/topics directly via the RobotConnection.
 * The Python code preview is educational — this is the real execution path.
 */

interface BlockData {
  type: string;
  fields: Record<string, string | number>;
  inputs: Record<string, BlockData | null>;
  next: BlockData | null;
}

export class BlockExecutor {
  private robot: RobotConnection;
  private running = false;
  private onLog: (msg: string) => void;
  private speed = 50; // default speed percentage

  constructor(robot: RobotConnection, onLog?: (msg: string) => void) {
    this.robot = robot;
    this.onLog = onLog || (() => {});
  }

  /**
   * Extract a serializable block tree from a Blockly workspace.
   * Call this in the browser where Blockly is loaded, then pass
   * the result to execute().
   */
  static serializeWorkspace(workspace: unknown): BlockData[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = workspace as any;
    const topBlocks = ws.getTopBlocks(true);
    return topBlocks.map((block: unknown) => BlockExecutor.serializeBlock(block));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static serializeBlock(block: any): BlockData {
    const fields: Record<string, string | number> = {};
    const inputs: Record<string, BlockData | null> = {};

    // Extract field values
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (field.name) {
          fields[field.name] = field.getValue();
        }
      }
      // Extract connected value blocks
      if (input.connection && input.connection.targetBlock()) {
        inputs[input.name] = BlockExecutor.serializeBlock(input.connection.targetBlock());
      }
    }

    return {
      type: block.type,
      fields,
      inputs,
      next: block.getNextBlock()
        ? BlockExecutor.serializeBlock(block.getNextBlock())
        : null,
    };
  }

  async execute(blocks: BlockData[]): Promise<void> {
    this.running = true;
    this.onLog("--- Execution started ---");

    try {
      for (const block of blocks) {
        if (!this.running) break;
        await this.executeChain(block);
      }
    } catch (err) {
      this.onLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.running = false;
    this.onLog("--- Execution finished ---");
  }

  stop() {
    this.running = false;
    this.robot.stop();
    this.onLog("--- Execution stopped ---");
  }

  private async executeChain(block: BlockData | null): Promise<void> {
    if (!block || !this.running) return;
    await this.executeBlock(block);
    await this.executeChain(block.next);
  }

  private async executeBlock(block: BlockData): Promise<void> {
    if (!this.running) return;

    switch (block.type) {
      // ---- Movement ----
      case "mars_move_forward": {
        // Support both STEPS and DISTANCE field names
        const steps = Number(block.fields.STEPS) || Math.round((Number(block.fields.DISTANCE) || 0.5) / 0.5) || 1;
        await this.robot.moveForward(steps);
        break;
      }

      case "mars_move_backward": {
        const steps = Number(block.fields.STEPS) || Math.round((Number(block.fields.DISTANCE) || 0.5) / 0.5) || 1;
        await this.robot.moveBackward(steps);
        break;
      }

      case "mars_turn":
        await this.robot.turn(
          String(block.fields.DIRECTION || "LEFT"),
          Number(block.fields.DEGREES) || 90
        );
        break;

      // hour_of_robotics split turn blocks
      case "mars_turn_left":
        await this.robot.turn("LEFT", Number(block.fields.ANGLE) || 90);
        break;

      case "mars_turn_right":
        await this.robot.turn("RIGHT", Number(block.fields.ANGLE) || 90);
        break;

      case "mars_move_forward_v": {
        const steps = Number(await this.evaluateValue(block.inputs.STEPS || null)) || 1;
        await this.robot.moveForward(steps);
        break;
      }

      case "mars_move_backward_v": {
        const steps = Number(await this.evaluateValue(block.inputs.STEPS || null)) || 1;
        await this.robot.moveBackward(steps);
        break;
      }

      case "mars_turn_v": {
        const dir = String(block.fields.DIRECTION || "LEFT");
        const deg = Number(await this.evaluateValue(block.inputs.DEGREES || null)) || 90;
        await this.robot.turn(dir, deg);
        break;
      }

      case "mars_stop":
        this.robot.stop();
        break;

      case "mars_set_speed":
        this.speed = Number(block.fields.SPEED) || 50;
        this.onLog(`Speed set to ${this.speed}%`);
        break;

      // ---- Arm & Gripper ----
      case "mars_arm_home":
        await this.robot.armHome();
        break;

      case "mars_arm_move_to": {
        const x = (Number(block.fields.X) || 0) / 100;
        const y = (Number(block.fields.Y) || 0) / 100;
        const z = (Number(block.fields.Z) || 20) / 100;
        await this.robot.executeSkill("innate-os/arm_move_to_xyz", { x, y, z });
        break;
      }

      case "mars_arm_move_to_v": {
        const x = (Number(await this.evaluateValue(block.inputs.X || null)) || 0) / 100;
        const y = (Number(await this.evaluateValue(block.inputs.Y || null)) || 0) / 100;
        const z = (Number(await this.evaluateValue(block.inputs.Z || null)) || 20) / 100;
        await this.robot.executeSkill("innate-os/arm_move_to_xyz", { x, y, z });
        break;
      }

      case "mars_joint_position": {
        const jointIndex = Number(block.fields.JOINT) || 1;
        const angle = Number(block.fields.ANGLE) || 0;
        const radians = (angle * Math.PI) / 180;
        this.onLog(`Joint ${jointIndex} -> ${angle}°`);
        // Build a 6-element array, set only the target joint
        const joints = [0, 0, 0, 0, 0, 0];
        joints[jointIndex - 1] = radians;
        await this.robot.armGoToJoints(joints);
        break;
      }

      case "mars_all_joints": {
        const degs = [
          Number(block.fields.J1) || 0,
          Number(block.fields.J2) || 0,
          Number(block.fields.J3) || 0,
          Number(block.fields.J4) || 0,
          Number(block.fields.J5) || 0,
          Number(block.fields.J6) || 0,
        ];
        const rads = degs.map((d) => (d * Math.PI) / 180);
        this.onLog(`All joints -> [${degs.join(", ")}]°`);
        await this.robot.armGoToJoints(rads);
        break;
      }

      case "mars_gripper":
        if (block.fields.ACTION === "OPEN") {
          await this.robot.gripperOpen();
        } else {
          await this.robot.gripperClose();
        }
        break;

      // hour_of_robotics split gripper blocks
      case "mars_open_gripper":
        await this.robot.gripperOpen();
        break;

      case "mars_close_gripper":
        await this.robot.gripperClose();
        break;

      case "mars_wave":
        await this.robot.wave();
        break;

      case "mars_pick_up":
        await this.robot.pickUp();
        break;

      case "mars_arm_torque_off":
        await this.robot.armTorqueOff();
        break;

      case "mars_arm_torque_on":
        await this.robot.armTorqueOn();
        break;

      // ---- Navigation ----
      case "mars_navigate_to":
        await this.robot.navigateTo(
          Number(block.fields.X) || 0,
          Number(block.fields.Y) || 0
        );
        break;

      case "mars_spin":
        await this.robot.spinInPlace(Number(block.fields.DEGREES) || 180);
        break;

      // ---- Head ----
      case "mars_head_tilt":
        this.robot.setHeadTilt(Number(block.fields.DEGREES) || 0);
        await new Promise((r) => setTimeout(r, 500));
        break;

      case "mars_head_tilt_v": {
        const deg = Number(await this.evaluateValue(block.inputs.DEGREES || null)) || 0;
        this.robot.setHeadTilt(deg);
        await new Promise((r) => setTimeout(r, 500));
        break;
      }

      case "mars_head_emotion":
        await this.robot.executeSkill("innate-os/head_emotion", {
          emotion: String(block.fields.EMOTION || "neutral"),
        });
        break;

      // ---- Speech ----
      case "mars_say":
        await this.robot.say(String(block.fields.TEXT || "Hello!"));
        break;

      case "mars_say_advanced": {
        const volume = Number(block.fields.VOLUME) || 80;
        this.robot.setVolume(volume);
        await this.robot.say(String(block.fields.TEXT || "Hello!"));
        break;
      }

      case "mars_set_volume":
        this.robot.setVolume(Number(block.fields.VOLUME) || 80);
        break;

      case "mars_say_value": {
        const text = await this.evaluateValue(block.inputs.TEXT || null);
        await this.robot.say(String(text || ""));
        break;
      }

      case "mars_set_voice":
        this.onLog(`Voice set to ${block.fields.VOICE}`);
        break;

      case "mars_play_sound":
        await this.robot.say(`[sound: ${block.fields.SOUND}]`);
        break;

      // ---- Lights ----
      case "mars_set_led_color":
        await this.robot.setLedColor(String(block.fields.COLOR || "#ff0000"));
        break;

      case "mars_led_pattern":
        await this.robot.setLedPattern(String(block.fields.PATTERN || "solid"));
        break;

      case "mars_leds_off":
        await this.robot.ledsOff();
        break;

      // ---- Skills ----
      case "mars_run_skill": {
        const skill = String(block.fields.SKILL || "");
        let params = {};
        try {
          params = JSON.parse(String(block.fields.PARAMS || "{}"));
        } catch {
          this.onLog("Invalid JSON params, using {}");
        }
        await this.robot.executeSkill(skill, params);
        break;
      }

      // ---- Console ----
      case "mars_print": {
        const value = await this.evaluateValue(block.inputs.VALUE || null);
        this.onLog(`${value}`);
        break;
      }

      // ---- Timing ----
      case "mars_wait": {
        const seconds = Number(block.fields.SECONDS) || 1;
        this.onLog(`Waiting ${seconds}s...`);
        await new Promise((r) => setTimeout(r, seconds * 1000));
        break;
      }

      // ---- Built-in Logic (Blockly standard) ----
      case "controls_if":
        await this.executeIf(block);
        break;

      // ---- Built-in Loops (Blockly standard) ----
      case "controls_repeat_ext":
        await this.executeRepeat(block);
        break;

      case "controls_whileUntil":
        await this.executeWhileUntil(block);
        break;

      // ---- hour_of_robotics custom logic blocks ----
      case "mars_repeat": {
        const count = Number(block.fields.COUNT) || 2;
        const body = block.inputs.DO;
        for (let i = 0; i < count && this.running; i++) {
          this.onLog(`Loop ${i + 1}/${count}`);
          if (body) await this.executeChain(body);
        }
        break;
      }

      case "mars_if_then": {
        const condBlock = block.inputs.CONDITION;
        const condition = condBlock ? await this.evaluateValue(condBlock) : true;
        if (condition) {
          const body = block.inputs.DO;
          if (body) await this.executeChain(body);
        }
        break;
      }

      default:
        this.onLog(`Unknown block: ${block.type}`);
    }
  }

  // ---- Control flow ----

  private async executeIf(block: BlockData): Promise<void> {
    const condition = await this.evaluateValue(block.inputs.IF0 || null);
    if (condition) {
      const doBlock = block.inputs.DO0;
      if (doBlock) await this.executeChain(doBlock);
    } else {
      const elseBlock = block.inputs.ELSE;
      if (elseBlock) await this.executeChain(elseBlock);
    }
  }

  private async executeRepeat(block: BlockData): Promise<void> {
    const timesBlock = block.inputs.TIMES;
    const times = timesBlock ? await this.evaluateNumber(timesBlock) : 1;
    const body = block.inputs.DO;

    for (let i = 0; i < times && this.running; i++) {
      this.onLog(`Loop iteration ${i + 1}/${times}`);
      if (body) await this.executeChain(body);
    }
  }

  private async executeWhileUntil(block: BlockData): Promise<void> {
    const mode = block.fields.MODE; // "WHILE" or "UNTIL"
    const body = block.inputs.DO;
    let maxIterations = 100; // safety limit

    while (this.running && maxIterations-- > 0) {
      const condition = await this.evaluateValue(block.inputs.BOOL || null);
      const shouldContinue = mode === "WHILE" ? !!condition : !condition;
      if (!shouldContinue) break;
      if (body) await this.executeChain(body);
    }
  }

  // ---- Value evaluation ----

  private async evaluateValue(block: BlockData | null): Promise<unknown> {
    if (!block) return false;

    switch (block.type) {
      case "logic_boolean":
        return block.fields.BOOL === "TRUE";

      case "logic_compare": {
        const a = await this.evaluateNumber(block.inputs.A || null);
        const b = await this.evaluateNumber(block.inputs.B || null);
        switch (block.fields.OP) {
          case "EQ": return a === b;
          case "NEQ": return a !== b;
          case "LT": return a < b;
          case "LTE": return a <= b;
          case "GT": return a > b;
          case "GTE": return a >= b;
          default: return false;
        }
      }

      case "logic_operation": {
        const left = await this.evaluateValue(block.inputs.A || null);
        const right = await this.evaluateValue(block.inputs.B || null);
        return block.fields.OP === "AND" ? left && right : left || right;
      }

      case "logic_negate":
        return !(await this.evaluateValue(block.inputs.BOOL || null));

      case "math_number":
        return Number(block.fields.NUM) || 0;

      case "math_arithmetic": {
        const left = await this.evaluateNumber(block.inputs.A || null);
        const right = await this.evaluateNumber(block.inputs.B || null);
        switch (block.fields.OP) {
          case "ADD": return left + right;
          case "MINUS": return left - right;
          case "MULTIPLY": return left * right;
          case "DIVIDE": return right !== 0 ? left / right : 0;
          case "POWER": return Math.pow(left, right);
          default: return 0;
        }
      }

      // ---- Sensor values ----
      case "mars_get_distance":
        return await this.robot.getDistance();

      case "mars_see_object":
        this.onLog(`Checking camera for ${block.fields.OBJECT}`);
        return false;

      case "mars_detect_object_color":
        this.onLog("Detecting object color...");
        return "";

      case "mars_is_obstacle_ahead": {
        const dist = await this.robot.getDistance();
        this.onLog(`Distance: ${dist}cm`);
        return dist > 0 && dist < 30;
      }

      case "mars_listen":
        this.onLog("Listening for speech...");
        return "";

      case "mars_abs": {
        const val = await this.evaluateValue(block.inputs.VALUE || null);
        return Math.abs(Number(val) || 0);
      }

      // ---- Random ----
      case "mars_random": {
        const min = Number(block.fields.MIN) || 0;
        const max = Number(block.fields.MAX) || 10;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      // ---- AI / Chat ----
      case "mars_chat_ask":
        return await this.robot.chatAsk(String(block.fields.MESSAGE || ""));

      // ---- Tag detection ----
      case "mars_tag_detect_arm": {
        const axis = String(block.fields.AXIS || "X");
        this.onLog(`Reading arm tag ${axis}...`);
        return await this.robot.getTagPoseArm(axis);
      }

      case "mars_tag_detect_head": {
        const axis = String(block.fields.AXIS || "X");
        this.onLog(`Reading head tag ${axis}...`);
        return await this.robot.getTagPoseHead(axis);
      }

      case "mars_is_tag_detected": {
        this.onLog("Checking for tags...");
        return await this.robot.isTagDetected();
      }

      // ---- Battery & Heading ----
      case "mars_get_battery":
        return await this.robot.getBattery();

      case "mars_get_heading":
        return await this.robot.getHeading();

      default:
        return 0;
    }
  }

  private async evaluateNumber(block: BlockData | null): Promise<number> {
    const val = await this.evaluateValue(block);
    return Number(val) || 0;
  }
}
