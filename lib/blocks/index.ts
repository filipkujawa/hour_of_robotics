import * as Blockly from "blockly";
import movementBlocks from "./movement";
import sensorBlocks from "./sensors";
import armBlocks from "./arm";
import speechBlocks from "./speech";
import lightBlocks from "./lights";
import waitBlocks from "./wait";
import headBlocks from "./head";
import navigationBlocks from "./navigation";
import chatBlocks from "./chat";
import { getAvailableSkills } from "./wait";

export function registerAllBlocks() {
  Blockly.common.defineBlocks(movementBlocks);
  Blockly.common.defineBlocks(sensorBlocks);
  Blockly.common.defineBlocks(armBlocks);
  Blockly.common.defineBlocks(speechBlocks);
  Blockly.common.defineBlocks(lightBlocks);
  Blockly.common.defineBlocks(waitBlocks);
  Blockly.common.defineBlocks(headBlocks);
  Blockly.common.defineBlocks(navigationBlocks);
  Blockly.common.defineBlocks(chatBlocks);

  // Dynamic dropdown skill block — defined manually because JSON defs
  // don't support function-based dropdowns
  Blockly.Blocks["mars_run_skill"] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField("run skill")
        .appendField(
          new Blockly.FieldDropdown(() => getAvailableSkills()),
          "SKILL"
        );
      this.appendDummyInput()
        .appendField("with")
        .appendField(new Blockly.FieldTextInput("{}"), "PARAMS");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#636e72");
      this.setTooltip(
        "Run any robot skill by name. Params is JSON like {\"duration\": 2000}"
      );
    },
  };
}
