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
    tooltip: "Wait until a condition becomes true (checks every 0.5s)",
  },
  // ---- Forever loop ----
  {
    type: "mars_forever",
    message0: "repeat forever %1 %2",
    args0: [
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    colour: "#00b894",
    tooltip: "Repeat the blocks inside forever until you press Stop",
  },
  // ---- Event blocks ----
  {
    type: "mars_when_condition",
    message0: "when %1 do %2 %3",
    args0: [
      { type: "input_value", name: "CONDITION", check: "Boolean" },
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Wait until the condition is true, then run the blocks inside once",
  },
  {
    type: "mars_when_distance",
    message0: "when distance < %1 cm do %2 %3",
    args0: [
      { type: "field_number", name: "THRESHOLD", value: 30, min: 1, max: 600 },
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Wait until something is closer than the threshold, then run the blocks",
  },
  {
    type: "mars_when_tag",
    message0: "when tag detected do %1 %2",
    args0: [
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#6c5ce7",
    tooltip: "Wait until an AprilTag is detected, then run the blocks",
  },
  // ---- Sensor store blocks (2) ----
  {
    type: "mars_read_distance",
    message0: "read distance into %1",
    args0: [{ type: "field_variable", name: "VAR", variable: "distance" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#0984e3",
    tooltip: "Read the LiDAR distance and store it in a variable",
  },
  {
    type: "mars_read_heading",
    message0: "read heading into %1",
    args0: [{ type: "field_variable", name: "VAR", variable: "heading" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#0984e3",
    tooltip: "Read the robot heading and store it in a variable",
  },
  {
    type: "mars_read_battery",
    message0: "read battery into %1",
    args0: [{ type: "field_variable", name: "VAR", variable: "battery" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#0984e3",
    tooltip: "Read the battery percentage and store it in a variable",
  },
  {
    type: "mars_read_tag",
    message0: "read %1 tag %2 into %3",
    args0: [
      {
        type: "field_dropdown",
        name: "CAMERA",
        options: [
          ["arm", "ARM"],
          ["head", "HEAD"],
        ],
      },
      {
        type: "field_dropdown",
        name: "AXIS",
        options: [
          ["x", "X"],
          ["y", "Y"],
          ["z", "Z"],
        ],
      },
      { type: "field_variable", name: "VAR", variable: "tag_pos" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#0984e3",
    tooltip: "Read a tag position axis and store it in a variable",
  },
]);

export default waitBlocks;
