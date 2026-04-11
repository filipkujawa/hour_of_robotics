import * as Blockly from "blockly";

const waitBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_wait",
    message0: "wait %1 seconds",
    args0: [
      { type: "field_number", name: "SECONDS", value: 1, min: 0.1, max: 30 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Pause for a number of seconds",
  },
  {
    type: "mars_print",
    message0: "print to console %1",
    args0: [{ type: "input_value", name: "VALUE" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Print a value to the console log — plug in any round block",
  },
  {
    type: "mars_wait_until",
    message0: "wait until %1",
    args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Wait until a condition becomes true",
  },
]);

export default waitBlocks;
