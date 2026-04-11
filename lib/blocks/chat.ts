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
]);

export default chatBlocks;
