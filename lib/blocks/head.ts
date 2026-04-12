import * as Blockly from "blockly";

const headBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_head_tilt",
    message0: "tilt head %1 degrees",
    args0: [
      {
        type: "field_number",
        name: "DEGREES",
        value: 0,
        min: -25,
        max: 15,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#a29bfe",
    tooltip: "Tilt the robot head (-25 down to +15 up)",
  },
  {
    type: "mars_head_tilt_v",
    message0: "tilt head %1 degrees",
    args0: [{ type: "input_value", name: "DEGREES", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#a29bfe",
    tooltip: "Tilt head — plug in a variable or expression for degrees",
  },
  {
    type: "mars_head_emotion",
    message0: "express %1",
    args0: [
      {
        type: "field_dropdown",
        name: "EMOTION",
        options: [
          ["happy", "happy"],
          ["sad", "sad"],
          ["excited", "excited"],
          ["thinking", "thinking"],
          ["neutral", "neutral"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#a29bfe",
    tooltip: "Express an emotion using head movement",
  },
]);

export default headBlocks;
