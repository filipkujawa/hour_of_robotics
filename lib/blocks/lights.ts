import * as Blockly from "blockly";

const lightBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_set_led_color",
    message0: "set LEDs to %1",
    args0: [
      {
        type: "field_colour",
        name: "COLOR",
        colour: "#ff0000",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#e84393",
    tooltip: "Change the color of Mars's LED lights",
  },
  {
    type: "mars_led_pattern",
    message0: "LED pattern %1",
    args0: [
      {
        type: "field_dropdown",
        name: "PATTERN",
        options: [
          ["solid", "SOLID"],
          ["blink", "BLINK"],
          ["pulse", "PULSE"],
          ["rainbow", "RAINBOW"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#e84393",
    tooltip: "Set the LED animation pattern",
  },
  {
    type: "mars_leds_off",
    message0: "turn LEDs off",
    previousStatement: null,
    nextStatement: null,
    colour: "#e84393",
    tooltip: "Turn off all LEDs",
  },
]);

export default lightBlocks;
