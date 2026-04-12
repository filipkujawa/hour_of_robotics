import * as Blockly from "blockly";

const sensorBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_get_distance",
    message0: "distance (cm)",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns a number: distance to nearest object in cm. Plug into print, say, if-comparisons, or variables.",
  },
  {
    type: "mars_see_object",
    message0: "camera sees %1",
    args0: [
      {
        type: "field_dropdown",
        name: "OBJECT",
        options: [
          ["anything", "ANY"],
          ["person", "PERSON"],
          ["red ball", "RED_BALL"],
          ["blue cube", "BLUE_CUBE"],
          ["hand", "HAND"],
        ],
      },
    ],
    output: "Boolean",
    colour: "#0984e3",
    tooltip: "Check if the camera detects a specific object",
  },
  {
    type: "mars_take_photo",
    message0: "take a photo",
    previousStatement: null,
    nextStatement: null,
    colour: "#0984e3",
    tooltip: "Capture an image from the front camera",
  },
  {
    type: "mars_get_object_position",
    message0: "%1 position of %2",
    args0: [
      {
        type: "field_dropdown",
        name: "AXIS",
        options: [
          ["x", "X"],
          ["y", "Y"],
        ],
      },
      {
        type: "field_dropdown",
        name: "OBJECT",
        options: [
          ["detected object", "ANY"],
          ["person", "PERSON"],
          ["red ball", "RED_BALL"],
        ],
      },
    ],
    output: "Number",
    colour: "#0984e3",
    tooltip: "Get the x or y position of a detected object in the camera frame",
  },
  {
    type: "mars_tag_detect_arm",
    message0: "arm camera tag %1",
    args0: [
      {
        type: "field_dropdown",
        name: "AXIS",
        options: [
          ["x position", "X"],
          ["y position", "Y"],
          ["z position", "Z"],
        ],
      },
    ],
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns the X, Y, or Z position of a detected AprilTag from the arm camera",
  },
  {
    type: "mars_tag_detect_head",
    message0: "head camera tag %1",
    args0: [
      {
        type: "field_dropdown",
        name: "AXIS",
        options: [
          ["x position", "X"],
          ["y position", "Y"],
          ["z position", "Z"],
        ],
      },
    ],
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns the X or Z position of a detected AprilTag from the head camera",
  },
  {
    type: "mars_is_tag_detected_arm",
    message0: "arm tag detected?",
    output: "Boolean",
    colour: "#0984e3",
    tooltip: "Returns true if an AprilTag is currently detected by the arm camera (/aruco/detected)",
  },
  {
    type: "mars_is_tag_detected_head",
    message0: "head tag detected?",
    output: "Boolean",
    colour: "#0984e3",
    tooltip: "Returns true if an AprilTag is currently detected by the head camera (/aruco_left/detected)",
  },
  {
    type: "mars_get_angle_to_tag",
    message0: "angle to tag x %1 y %2",
    args0: [
      { type: "input_value", name: "X", check: "Number" },
      { type: "input_value", name: "Y", check: "Number" },
    ],
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns the angle (degrees) to turn toward a tag. Positive = left, negative = right. Plug into turn block.",
  },
  {
    type: "mars_get_battery",
    message0: "battery %",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns a number: battery percentage 0-100. Plug into print, say, if-comparisons, or variables.",
  },
  {
    type: "mars_get_heading",
    message0: "heading (deg)",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Returns a number: robot heading 0-360 degrees. Plug into print, say, if-comparisons, or variables.",
  },
]);

export default sensorBlocks;
