import * as Blockly from "blockly";

const chatBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_chat_ask",
    message0: "ask robot AI %1",
    args0: [
      { type: "field_input", name: "MESSAGE", text: "What do you see?" },
    ],
    output: "String",
    colour: "#6c5ce7",
    tooltip: "Send a message to the robot AI brain and get a response",
  },
  {
    type: "mars_chat_say",
    message0: "speak %1",
    args0: [
      { type: "field_input", name: "TEXT", text: "Hello!" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Make the robot speak using text-to-speech directly",
  },
]);

export default chatBlocks;
