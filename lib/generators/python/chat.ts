import { pythonGenerator, Order } from "blockly/python";

export function registerChatGenerators() {
  pythonGenerator.forBlock["mars_chat_ask"] = function (block) {
    const message = block.getFieldValue("MESSAGE");
    const escaped = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return [`mars.chat_ask("${escaped}")`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_chat_say"] = function (block) {
    const text = block.getFieldValue("TEXT");
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `mars.chat_say("${escaped}")\n`;
  };
}
