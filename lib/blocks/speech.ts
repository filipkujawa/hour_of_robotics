import * as Blockly from "blockly";

const speechBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_say",
    message0: 'say %1',
    args0: [{ type: "field_input", name: "TEXT", text: "Hello!" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#fdcb6e",
    tooltip: "Make Mars speak a message out loud",
  },
  {
    type: "mars_say_value",
    message0: "say %1",
    args0: [{ type: "input_value", name: "TEXT", check: "String" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#fdcb6e",
    tooltip: "Say the result of a plugged-in block — drag an oval block (AI response, sensor reading, variable) into the socket",
  },
  {
    type: "mars_listen",
    message0: "listen for speech",
    output: "String",
    colour: "#fdcb6e",
    tooltip: "Returns text: what the microphone heard. Plug into say, print, if-comparisons, or variables.",
  },
  {
    type: "mars_set_voice",
    message0: "set voice to %1",
    args0: [
      {
        type: "field_dropdown",
        name: "VOICE",
        options: [
          ["friendly", "FRIENDLY"],
          ["robot", "ROBOT"],
          ["whisper", "WHISPER"],
          ["excited", "EXCITED"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#fdcb6e",
    tooltip: "Change Mars's voice style",
  },
  {
    type: "mars_play_sound",
    message0: "play sound %1",
    args0: [
      {
        type: "field_dropdown",
        name: "SOUND",
        options: [
          ["beep", "BEEP"],
          ["success", "SUCCESS"],
          ["error", "ERROR"],
          ["music", "MUSIC"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#fdcb6e",
    tooltip: "Play a sound effect",
  },
]);

export default speechBlocks;
