import * as Blockly from "blockly";

// Dynamic skills list — updated at runtime when fetched from the robot
let _availableSkills: [string, string][] = [
  ["innate-os/arm_zero_position", "innate-os/arm_zero_position"],
  ["innate-os/arm_move_to_xyz", "innate-os/arm_move_to_xyz"],
  ["innate-os/arm_circle_motion", "innate-os/arm_circle_motion"],
  ["innate-os/head_emotion", "innate-os/head_emotion"],
  ["innate-os/wave", "innate-os/wave"],
  ["innate-os/arm_utils", "innate-os/arm_utils"],
  ["innate-os/pick_up_piece_simple", "innate-os/pick_up_piece_simple"],
  ["innate-os/navigate_to_position", "innate-os/navigate_to_position"],
  ["innate-os/navigate_with_vision", "innate-os/navigate_with_vision"],
  ["innate-os/record_position", "innate-os/record_position"],
  ["innate-os/recalibrate_manual", "innate-os/recalibrate_manual"],
  ["innate-os/send_email", "innate-os/send_email"],
  ["innate-os/send_picture_via_email", "innate-os/send_picture_via_email"],
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
    type: "mars_abs",
    message0: "abs %1",
    args0: [{ type: "input_value", name: "VALUE", check: "Number" }],
    output: "Number",
    colour: "#636e72",
    tooltip: "Returns the absolute value of a number",
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
