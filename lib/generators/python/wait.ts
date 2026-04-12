import { pythonGenerator, Order } from "blockly/python";

export function registerWaitGenerators() {
  pythonGenerator.forBlock["mars_wait"] = function (block) {
    const seconds = block.getFieldValue("SECONDS");
    return `mars.wait(${seconds})\n`;
  };

  pythonGenerator.forBlock["mars_run_skill"] = function (block) {
    const skill = block.getFieldValue("SKILL");
    const params = block.getFieldValue("PARAMS");
    const escapedSkill = skill.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `mars.run_skill("${escapedSkill}", ${params || "{}"})\n`;
  };

  pythonGenerator.forBlock["mars_abs"] = function (block, generator) {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    return [`abs(${value})`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_random"] = function (block) {
    const min = block.getFieldValue("MIN");
    const max = block.getFieldValue("MAX");
    return [`mars.random(${min}, ${max})`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock["mars_print"] = function (block, generator) {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || '""';
    return `print(${value})\n`;
  };

  pythonGenerator.forBlock["mars_wait_until"] = function (block, generator) {
    const condition =
      generator.valueToCode(block, "CONDITION", Order.NONE) || "False";
    return `mars.wait_until(lambda: ${condition})\n`;
  };

  pythonGenerator.forBlock["mars_forever"] = function (block, generator) {
    const body = generator.statementToCode(block, "DO") || "  pass\n";
    return `while True:\n${body}`;
  };

  pythonGenerator.forBlock["mars_when_condition"] = function (block, generator) {
    const condition = generator.valueToCode(block, "CONDITION", Order.NONE) || "False";
    const body = generator.statementToCode(block, "DO") || "  pass\n";
    return `mars.wait_until(lambda: ${condition})\n${body}`;
  };

  pythonGenerator.forBlock["mars_when_distance"] = function (block, generator) {
    const threshold = block.getFieldValue("THRESHOLD");
    const body = generator.statementToCode(block, "DO") || "  pass\n";
    return `mars.wait_until(lambda: mars.get_distance() < ${threshold})\n${body}`;
  };

  pythonGenerator.forBlock["mars_when_tag"] = function (block, generator) {
    const body = generator.statementToCode(block, "DO") || "  pass\n";
    return `mars.wait_until(lambda: mars.is_tag_detected())\n${body}`;
  };

  pythonGenerator.forBlock["mars_read_distance"] = function (block) {
    const v = pythonGenerator.getVariableName(block.getFieldValue("VAR"));
    return `${v} = mars.get_distance()\n`;
  };

  pythonGenerator.forBlock["mars_read_heading"] = function (block) {
    const v = pythonGenerator.getVariableName(block.getFieldValue("VAR"));
    return `${v} = mars.get_heading()\n`;
  };

  pythonGenerator.forBlock["mars_read_battery"] = function (block) {
    const v = pythonGenerator.getVariableName(block.getFieldValue("VAR"));
    return `${v} = mars.get_battery()\n`;
  };

  pythonGenerator.forBlock["mars_read_tag"] = function (block) {
    const camera = block.getFieldValue("CAMERA");
    const axis = block.getFieldValue("AXIS");
    const v = pythonGenerator.getVariableName(block.getFieldValue("VAR"));
    const fn = camera === "ARM" ? "tag_detect_arm" : "tag_detect_head";
    return `${v} = mars.${fn}("${axis.toLowerCase()}")\n`;
  };
}
