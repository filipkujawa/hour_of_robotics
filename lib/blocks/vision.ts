import * as Blockly from "blockly";

const visionBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_vision_find",
    message0: "find %1",
    args0: [
      { type: "field_input", name: "PROMPT", text: "person" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Tell the vision system what to look for (e.g. 'person wearing blue jeans', 'red backpack')",
  },
  {
    type: "mars_vision_find_v",
    message0: "find %1",
    args0: [
      { type: "input_value", name: "PROMPT", check: "String" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Tell the vision system what to look for — plug in a text block or variable",
  },
  {
    type: "mars_vision_detected",
    message0: "target detected?",
    output: "Boolean",
    colour: "#6c5ce7",
    tooltip: "Returns true if the vision system currently sees the target",
  },
  {
    type: "mars_vision_angle",
    message0: "target angle",
    output: "Number",
    colour: "#6c5ce7",
    tooltip: "Returns the angle (degrees) to the target. Positive = right, negative = left. Plug into turn block.",
  },
  {
    type: "mars_vision_distance",
    message0: "target distance (cm)",
    output: "Number",
    colour: "#6c5ce7",
    tooltip: "Returns estimated distance to the target in centimeters",
  },
]);

export default visionBlocks;
