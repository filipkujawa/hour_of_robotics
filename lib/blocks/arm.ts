import * as Blockly from "blockly";

const armBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_arm_home",
    message0: "move arm to home position",
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Reset the arm to its default home position",
  },
  {
    type: "mars_arm_move_to",
    message0: "move arm to x %1 y %2 z %3",
    args0: [
      { type: "field_number", name: "X", value: 0 },
      { type: "field_number", name: "Y", value: 0 },
      { type: "field_number", name: "Z", value: 20 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Move the arm end-effector to a position (cm)",
  },
  {
    type: "mars_gripper",
    message0: "%1 gripper",
    args0: [
      {
        type: "field_dropdown",
        name: "ACTION",
        options: [
          ["open", "OPEN"],
          ["close", "CLOSE"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Open or close the robot gripper",
  },
  {
    type: "mars_wave",
    message0: "wave hello",
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Make Mars wave its arm in greeting",
  },
  {
    type: "mars_pick_up",
    message0: "pick up object in front",
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Attempt to pick up the nearest object",
  },
  {
    type: "mars_arm_torque_off",
    message0: "arm torque off (freedrive)",
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Disable arm servo torque so you can move the arm by hand",
  },
  {
    type: "mars_arm_torque_on",
    message0: "arm torque on (lock)",
    previousStatement: null,
    nextStatement: null,
    colour: "#e17055",
    tooltip: "Re-enable arm servo torque to hold position",
  },
]);

export default armBlocks;
