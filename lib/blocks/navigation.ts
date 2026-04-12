import * as Blockly from "blockly";

const navigationBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_navigate_to",
    message0: "navigate to x %1 y %2",
    args0: [
      { type: "field_number", name: "X", value: 0 },
      { type: "field_number", name: "Y", value: 0 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00cec9",
    tooltip: "Navigate to a map position using Nav2 (meters)",
  },
  {
    type: "mars_spin",
    message0: "spin %1 degrees",
    args0: [
      { type: "field_number", name: "DEGREES", value: 180, min: -360, max: 360 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00cec9",
    tooltip: "Spin in place by a number of degrees (positive = counterclockwise)",
  },
  {
    type: "mars_save_position",
    message0: "save current position as %1",
    args0: [{ type: "field_input", name: "NAME", text: "home" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#00cec9",
    tooltip: "Save the robot's current position with a name so you can return to it later",
  },
  {
    type: "mars_go_to_position",
    message0: "go to saved position %1",
    args0: [{ type: "field_input", name: "NAME", text: "home" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#00cec9",
    tooltip: "Navigate to a previously saved position",
  },
  {
    type: "mars_drive_to",
    message0: "drive to %1",
    args0: [{ type: "field_input", name: "INSTRUCTION", text: "the red chair" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#00cec9",
    tooltip: "Use vision to navigate to a described location",
  },
]);

export default navigationBlocks;
