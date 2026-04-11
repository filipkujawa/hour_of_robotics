import { pythonGenerator } from "blockly/python";

export function registerArmGenerators() {
  pythonGenerator.forBlock["mars_arm_home"] = function () {
    return "mars.arm_home()\n";
  };

  pythonGenerator.forBlock["mars_arm_move_to"] = function (block) {
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    const z = block.getFieldValue("Z");
    return `mars.arm_move_to(${x}, ${y}, ${z})\n`;
  };

  pythonGenerator.forBlock["mars_gripper"] = function (block) {
    const action = block.getFieldValue("ACTION");
    return `mars.gripper("${action.toLowerCase()}")\n`;
  };

  pythonGenerator.forBlock["mars_wave"] = function () {
    return "mars.wave()\n";
  };

  pythonGenerator.forBlock["mars_pick_up"] = function () {
    return "mars.pick_up()\n";
  };

  pythonGenerator.forBlock["mars_arm_torque_off"] = function () {
    return "mars.arm_torque_off()\n";
  };

  pythonGenerator.forBlock["mars_arm_torque_on"] = function () {
    return "mars.arm_torque_on()\n";
  };
}
