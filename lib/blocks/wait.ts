import * as Blockly from "blockly";

// Dynamic skills list — updated at runtime when fetched from the robot
let _availableSkills: [string, string][] = [
  ["arm_zero_position", "arm_zero_position"],
  ["arm_move_to_xyz", "arm_move_to_xyz"],
  ["arm_circle_motion", "arm_circle_motion"],
  ["head_emotion", "head_emotion"],
  ["open_gripper", "open_gripper"],
  ["close_gripper", "close_gripper"],
  ["pick_up_piece_simple", "pick_up_piece_simple"],
  ["navigate_to_position", "navigate_to_position"],
  ["navigate_with_vision", "navigate_with_vision"],
  ["scan_for_objects", "scan_for_objects"],
  ["record_position", "record_position"],
  ["recalibrate_manual", "recalibrate_manual"],
  ["detect_opponent_move", "detect_opponent_move"],
  ["send_email", "send_email"],
  ["send_picture_via_email", "send_picture_via_email"],
  ["retrieve_emails", "retrieve_emails"],
];

export function updateAvailableSkills(skills: string[]) {
  if (skills.length > 0) {
    _availableSkills = skills.map((s) => [s, s]);
  }
}

export function getAvailableSkills(): [string, string][] {
  return _availableSkills;
}

const waitBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_wait",
    message0: "wait %1 seconds",
    args0: [
      { type: "field_number", name: "SECONDS", value: 1, min: 0.1, max: 30 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Pause for a number of seconds",
  },
  {
    type: "mars_random",
    message0: "random %1 to %2",
    args0: [
      { type: "field_number", name: "MIN", value: 1 },
      { type: "field_number", name: "MAX", value: 10 },
    ],
    output: "Number",
    colour: "#636e72",
    tooltip: "Returns a random whole number between min and max. Plug into print, say, movement, or variables.",
  },
  {
    type: "mars_print",
    message0: "print to console %1",
    args0: [{ type: "input_value", name: "VALUE" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Print a value to the console log — plug in any round block",
  },
  {
    type: "mars_wait_until",
    message0: "wait until %1",
    args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#636e72",
    tooltip: "Wait until a condition becomes true",
  },
]);

export default waitBlocks;
