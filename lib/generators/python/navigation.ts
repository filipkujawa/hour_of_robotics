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
}
