import { pythonGenerator, Order } from "blockly/python";

export function registerSpeechGenerators() {
  pythonGenerator.forBlock["mars_say"] = function (block) {
    const text = block.getFieldValue("TEXT");
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `mars.say("${escaped}")\n`;
  };

  pythonGenerator.forBlock["mars_say_value"] = function (block) {
    const text = pythonGenerator.valueToCode(block, "TEXT", Order.NONE) || '""';
    return `mars.say(${text})\n`;
  };

  pythonGenerator.forBlock["mars_listen"] = function () {
    return ["mars.listen()", Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_set_voice"] = function (block) {
    const voice = block.getFieldValue("VOICE");
    return `mars.set_voice("${voice.toLowerCase()}")\n`;
  };

  pythonGenerator.forBlock["mars_play_sound"] = function (block) {
    const sound = block.getFieldValue("SOUND");
    return `mars.play_sound("${sound.toLowerCase()}")\n`;
  };
}
