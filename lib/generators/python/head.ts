import { pythonGenerator } from "blockly/python";

export function registerHeadGenerators() {
  pythonGenerator.forBlock["mars_head_tilt"] = function (block) {
    const degrees = block.getFieldValue("DEGREES");
    return `mars.head_tilt(${degrees})\n`;
  };

  pythonGenerator.forBlock["mars_head_emotion"] = function (block) {
    const emotion = block.getFieldValue("EMOTION");
    return `mars.head_emotion("${emotion}")\n`;
  };
}
