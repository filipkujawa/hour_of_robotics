import * as Blockly from "blockly";

const sensorBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: "mars_get_distance",
    message0: "distance to nearest object",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Get distance reading from LiDAR (in cm)",
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
    type: "mars_get_battery",
    message0: "battery level %",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Get the current battery percentage (0-100)",
  },
  {
    type: "mars_get_heading",
    message0: "robot heading (degrees)",
    output: "Number",
    colour: "#0984e3",
    tooltip: "Get the robot's current heading from odometry (0-360 degrees)",
  },
]);

export default sensorBlocks;
