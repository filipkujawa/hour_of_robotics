import { pythonGenerator, Order } from "blockly/python";

export function registerSensorGenerators() {
  pythonGenerator.forBlock["mars_get_distance"] = function () {
    return ["mars.get_distance()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_see_object"] = function (block) {
    const object = block.getFieldValue("OBJECT");
    return [`mars.see_object("${object.toLowerCase()}")`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_take_photo"] = function () {
    return "mars.take_photo()\n";
  };

  pythonGenerator.forBlock["mars_get_object_position"] = function (block) {
    const axis = block.getFieldValue("AXIS");
    const object = block.getFieldValue("OBJECT");
    return [
      `mars.get_object_position("${object.toLowerCase()}", "${axis.toLowerCase()}")`,
      Order.FUNCTION_CALL,
    ];
  };

  pythonGenerator.forBlock["mars_tag_detect_arm"] = function (block) {
    const axis = block.getFieldValue("AXIS");
    return [`mars.tag_detect_arm("${axis.toLowerCase()}")`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_tag_detect_head"] = function (block) {
    const axis = block.getFieldValue("AXIS");
    return [`mars.tag_detect_head("${axis.toLowerCase()}")`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_is_tag_detected_arm"] = function () {
    return ["mars.is_tag_detected_arm()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_is_tag_detected_head"] = function () {
    return ["mars.is_tag_detected_head()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_get_angle_to_tag"] = function (block) {
    const x = pythonGenerator.valueToCode(block, "X", Order.NONE) || "0";
    const y = pythonGenerator.valueToCode(block, "Y", Order.NONE) || "0";
    return [`mars.get_angle_to_tag(${x}, ${y})`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_get_battery"] = function () {
    return ["mars.get_battery()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_get_heading"] = function () {
    return ["mars.get_heading()", Order.FUNCTION_CALL];
  };
}
