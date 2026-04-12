import * as Blockly from "blockly";

const movementBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_move_forward",
    message0: "move forward %1 steps",
    args0: [
      { type: "field_number", name: "STEPS", value: 1, min: 0, max: 100 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Move Mars forward by a number of steps",
    helpUrl: "",
  },
  {
    type: "mars_move_backward",
    message0: "move backward %1 steps",
    args0: [
      { type: "field_number", name: "STEPS", value: 1, min: 0, max: 100 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Move Mars backward by a number of steps",
  },
  {
    type: "mars_turn",
    message0: "turn %1 by %2 degrees",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["left", "LEFT"],
          ["right", "RIGHT"],
        ],
      },
      { type: "field_number", name: "DEGREES", value: 90, min: 0, max: 360 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Turn Mars left or right",
  },
  {
    type: "mars_move_forward_v",
    message0: "move forward %1 steps",
    args0: [{ type: "input_value", name: "STEPS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Move forward — plug in a variable or expression for steps",
  },
  {
    type: "mars_move_backward_v",
    message0: "move backward %1 steps",
    args0: [{ type: "input_value", name: "STEPS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Move backward — plug in a variable or expression for steps",
  },
  {
    type: "mars_turn_v",
    message0: "turn %1 by %2 degrees",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["left", "LEFT"],
          ["right", "RIGHT"],
        ],
      },
      { type: "input_value", name: "DEGREES", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Turn — plug in a variable or expression for degrees",
  },
  {
    type: "mars_drive_meters",
    message0: "drive %1 %2 meters",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["forward", "FORWARD"],
          ["backward", "BACKWARD"],
        ],
      },
      { type: "field_number", name: "METERS", value: 0.5, min: 0, max: 10 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Drive a specific distance in meters",
  },
  {
    type: "mars_drive_meters_v",
    message0: "drive %1 %2 meters",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["forward", "FORWARD"],
          ["backward", "BACKWARD"],
        ],
      },
      { type: "input_value", name: "METERS", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Drive a distance — plug in a variable for meters",
  },
  {
    type: "mars_stop",
    message0: "stop moving",
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Stop all movement",
  },
  {
    type: "mars_set_speed",
    message0: "set speed to %1 %",
    args0: [
      { type: "field_number", name: "SPEED", value: 50, min: 0, max: 100 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#00b894",
    tooltip: "Set movement speed (0-100%)",
  },
]);

export default movementBlocks;
