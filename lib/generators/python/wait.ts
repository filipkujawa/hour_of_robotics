import { pythonGenerator, Order } from "blockly/python";

export function registerWaitGenerators() {
  pythonGenerator.forBlock["mars_wait"] = function (block) {
    const seconds = block.getFieldValue("SECONDS");
    return `mars.wait(${seconds})\n`;
  };

  pythonGenerator.forBlock["mars_wait_until"] = function (block, generator) {
    const condition =
      generator.valueToCode(block, "CONDITION", Order.NONE) || "False";
    return `mars.wait_until(lambda: ${condition})\n`;
  };
}
