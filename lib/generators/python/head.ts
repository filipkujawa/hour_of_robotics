import { pythonGenerator, Order } from "blockly/python";

export function registerHeadGenerators() {
  pythonGenerator.forBlock["mars_head_tilt"] = function (block) {
    const degrees = block.getFieldValue("DEGREES");
    return `mars.head_tilt(${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_head_tilt_v"] = function (block, generator) {
    const degrees = generator.valueToCode(block, "DEGREES", Order.NONE) || "0";
    return `mars.head_tilt(${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_head_emotion"] = function (block) {
    const emotion = block.getFieldValue("EMOTION");
    return `mars.head_emotion("${emotion}")\n`;
  };
}
