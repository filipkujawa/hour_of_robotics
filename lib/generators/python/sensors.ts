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
}
