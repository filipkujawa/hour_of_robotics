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
}
