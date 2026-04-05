import { pythonGenerator } from "blockly/python";

export function registerLightGenerators() {
  pythonGenerator.forBlock["mars_set_led_color"] = function (block) {
    const color = block.getFieldValue("COLOR");
    return `mars.set_led_color("${color}")\n`;
  };

  pythonGenerator.forBlock["mars_led_pattern"] = function (block) {
    const pattern = block.getFieldValue("PATTERN");
    return `mars.led_pattern("${pattern.toLowerCase()}")\n`;
  };

  pythonGenerator.forBlock["mars_leds_off"] = function () {
    return "mars.leds_off()\n";
  };
}
