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
    tooltip: "Returns text: the AI's response. Plug into say, print, if-comparisons, or variables.",
  },
  {
    type: "mars_gemma_ask",
    message0: "gemma %1",
    args0: [
      { type: "field_input", name: "PROMPT", text: "Describe what a robot sensor does." },
    ],
    output: "String",
    colour: "#8e6cff",
    tooltip: "Calls the local Gemma model running on your laptop and returns its text response.",
  },
]);

export default chatBlocks;
