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
