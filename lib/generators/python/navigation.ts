import { pythonGenerator } from "blockly/python";

export function registerNavigationGenerators() {
  pythonGenerator.forBlock["mars_navigate_to"] = function (block) {
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    return `mars.navigate_to(${x}, ${y})\n`;
  };

  pythonGenerator.forBlock["mars_spin"] = function (block) {
    const degrees = block.getFieldValue("DEGREES");
    return `mars.spin(${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_save_position"] = function (block) {
    const name = block.getFieldValue("NAME");
    return `mars.save_position("${name}")\n`;
  };

  pythonGenerator.forBlock["mars_go_to_position"] = function (block) {
    const name = block.getFieldValue("NAME");
    return `mars.go_to_position("${name}")\n`;
  };

  pythonGenerator.forBlock["mars_drive_to"] = function (block) {
    const instruction = block.getFieldValue("INSTRUCTION");
    const escaped = instruction.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `mars.drive_to("${escaped}")\n`;
  };
}
