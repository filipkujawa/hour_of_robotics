import { pythonGenerator, Order } from "blockly/python";

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

  pythonGenerator.forBlock["mars_arm_move_to_v"] = function (block, generator) {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    const z = generator.valueToCode(block, "Z", Order.NONE) || "20";
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

  pythonGenerator.forBlock["mars_joint_position"] = function (block) {
    const joint = block.getFieldValue("JOINT");
    const angle = block.getFieldValue("ANGLE");
    return `mars.set_joint(${joint}, ${angle})\n`;
  };

  pythonGenerator.forBlock["mars_all_joints"] = function (block) {
    const j1 = block.getFieldValue("J1");
    const j2 = block.getFieldValue("J2");
    const j3 = block.getFieldValue("J3");
    const j4 = block.getFieldValue("J4");
    const j5 = block.getFieldValue("J5");
    const j6 = block.getFieldValue("J6");
    return `mars.set_all_joints(${j1}, ${j2}, ${j3}, ${j4}, ${j5}, ${j6})\n`;
  };

  pythonGenerator.forBlock["mars_arm_torque_off"] = function () {
    return "mars.arm_torque_off()\n";
  };

  pythonGenerator.forBlock["mars_arm_torque_on"] = function () {
    return "mars.arm_torque_on()\n";
  };
}
