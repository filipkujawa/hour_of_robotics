import { pythonGenerator, Order } from "blockly/python";

export function registerMovementGenerators() {
  pythonGenerator.forBlock["mars_move_forward"] = function (block) {
    const steps = block.getFieldValue("STEPS");
    return `mars.move_forward(${steps})\n`;
  };

  pythonGenerator.forBlock["mars_move_backward"] = function (block) {
    const steps = block.getFieldValue("STEPS");
    return `mars.move_backward(${steps})\n`;
  };

  pythonGenerator.forBlock["mars_turn"] = function (block) {
    const direction = block.getFieldValue("DIRECTION");
    const degrees = block.getFieldValue("DEGREES");
    return `mars.turn("${direction.toLowerCase()}", ${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_move_forward_v"] = function (block, generator) {
    const steps = generator.valueToCode(block, "STEPS", Order.NONE) || "1";
    return `mars.move_forward(${steps})\n`;
  };

  pythonGenerator.forBlock["mars_move_backward_v"] = function (block, generator) {
    const steps = generator.valueToCode(block, "STEPS", Order.NONE) || "1";
    return `mars.move_backward(${steps})\n`;
  };

  pythonGenerator.forBlock["mars_turn_v"] = function (block, generator) {
    const direction = block.getFieldValue("DIRECTION");
    const degrees = generator.valueToCode(block, "DEGREES", Order.NONE) || "90";
    return `mars.turn("${direction.toLowerCase()}", ${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_stop"] = function () {
    return "mars.stop()\n";
  };

  pythonGenerator.forBlock["mars_drive_meters"] = function (block) {
    const dir = block.getFieldValue("DIRECTION");
    const meters = block.getFieldValue("METERS");
    return `mars.drive(${dir === "BACKWARD" ? -meters : meters})\n`;
  };

  pythonGenerator.forBlock["mars_drive_meters_v"] = function (block, generator) {
    const dir = block.getFieldValue("DIRECTION");
    const meters = generator.valueToCode(block, "METERS", Order.NONE) || "0.5";
    const sign = dir === "BACKWARD" ? "-" : "";
    return `mars.drive(${sign}${meters})\n`;
  };

  pythonGenerator.forBlock["mars_set_speed"] = function (block) {
    const speed = block.getFieldValue("SPEED");
    return `mars.set_speed(${speed})\n`;
  };
}
