import { pythonGenerator, Order } from "blockly/python";

export function registerVisionGenerators() {
  pythonGenerator.forBlock["mars_vision_find"] = function (block) {
    const prompt = block.getFieldValue("PROMPT");
    const escaped = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `mars.vision_find("${escaped}")\n`;
  };

  pythonGenerator.forBlock["mars_vision_find_v"] = function (block) {
    const prompt = pythonGenerator.valueToCode(block, "PROMPT", Order.NONE) || '""';
    return `mars.vision_find(${prompt})\n`;
  };

  pythonGenerator.forBlock["mars_vision_detected"] = function () {
    return ["mars.vision_detected()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_vision_angle"] = function () {
    return ["mars.vision_angle()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_vision_distance"] = function () {
    return ["mars.vision_distance()", Order.FUNCTION_CALL];
  };
}
