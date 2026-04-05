"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Blockly from "blockly";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Code2, Lightbulb, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/course-data";
import { useLessonStore } from "@/lib/store/lesson-store";

const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Movement",
      colour: "#7c3aed",
      contents: [
        { kind: "block", type: "mars_move_forward" },
        { kind: "block", type: "mars_move_backward" },
        { kind: "block", type: "mars_turn_left" },
        { kind: "block", type: "mars_turn_right" },
        { kind: "block", type: "mars_set_speed" }
      ]
    },
    {
      kind: "category",
      name: "Arm",
      colour: "#d97706",
      contents: [
        { kind: "block", type: "mars_wave" },
        { kind: "block", type: "mars_joint_position" },
        { kind: "block", type: "mars_open_gripper" },
        { kind: "block", type: "mars_close_gripper" }
      ]
    },
    {
      kind: "category",
      name: "Sensing",
      colour: "#0891b2",
      contents: [
        { kind: "block", type: "mars_get_distance" },
        { kind: "block", type: "mars_detect_object_color" },
        { kind: "block", type: "mars_is_obstacle_ahead" }
      ]
    },
    {
      kind: "category",
      name: "Speech",
      colour: "#8b5cf6",
      contents: [
        { kind: "block", type: "mars_say" },
        { kind: "block", type: "mars_listen" }
      ]
    },
    {
      kind: "category",
      name: "Logic",
      colour: "#64748b",
      contents: [
        { kind: "block", type: "mars_repeat" },
        { kind: "block", type: "mars_if_then" },
        { kind: "block", type: "mars_wait" }
      ]
    }
  ]
};

function ensureBlocksDefined() {
  if (Blockly.Blocks.mars_say) {
    return;
  }

  Blockly.Blocks.mars_say = {
    init() {
      this.appendDummyInput().appendField("say").appendField(new Blockly.FieldTextInput("Hello!"), "TEXT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#8b5cf6");
    }
  };

  const movementBlock = (type: string, label: string, field: string, defaultValue: string, unit: string, color: string) => {
    Blockly.Blocks[type] = {
      init() {
        this.appendDummyInput()
          .appendField(label)
          .appendField(new Blockly.FieldNumber(Number(defaultValue), 0), field)
          .appendField(unit);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(color);
      }
    };
  };

  movementBlock("mars_move_forward", "move forward", "DISTANCE", "0.5", "m", "#7c3aed");
  movementBlock("mars_move_backward", "move backward", "DISTANCE", "0.5", "m", "#7c3aed");
  movementBlock("mars_turn_left", "turn left", "ANGLE", "90", "deg", "#7c3aed");
  movementBlock("mars_turn_right", "turn right", "ANGLE", "90", "deg", "#7c3aed");
  movementBlock("mars_set_speed", "set speed", "SPEED", "0.4", "m/s", "#7c3aed");

  Blockly.Blocks.mars_wave = {
    init() {
      this.appendDummyInput().appendField("wave arm");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#d97706");
    }
  };

  Blockly.Blocks.mars_joint_position = {
    init() {
      this.appendDummyInput()
        .appendField("set joint")
        .appendField(new Blockly.FieldDropdown([["shoulder", "shoulder"], ["elbow", "elbow"], ["wrist", "wrist"]]), "JOINT")
        .appendField("to")
        .appendField(new Blockly.FieldNumber(45), "VALUE")
        .appendField("deg");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#d97706");
    }
  };

  Blockly.Blocks.mars_open_gripper = {
    init() {
      this.appendDummyInput().appendField("open gripper");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#d97706");
    }
  };

  Blockly.Blocks.mars_close_gripper = {
    init() {
      this.appendDummyInput().appendField("close gripper");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#d97706");
    }
  };

  Blockly.Blocks.mars_get_distance = {
    init() {
      this.appendDummyInput().appendField("get distance");
      this.setOutput(true, "Number");
      this.setColour("#0891b2");
    }
  };

  Blockly.Blocks.mars_detect_object_color = {
    init() {
      this.appendDummyInput().appendField("detect object color");
      this.setOutput(true, "String");
      this.setColour("#0891b2");
    }
  };

  Blockly.Blocks.mars_is_obstacle_ahead = {
    init() {
      this.appendDummyInput().appendField("is obstacle ahead");
      this.setOutput(true, "Boolean");
      this.setColour("#0891b2");
    }
  };

  Blockly.Blocks.mars_listen = {
    init() {
      this.appendDummyInput().appendField("listen for command");
      this.setOutput(true, "String");
      this.setColour("#8b5cf6");
    }
  };

  Blockly.Blocks.mars_wait = {
    init() {
      this.appendDummyInput().appendField("wait").appendField(new Blockly.FieldNumber(1, 0), "SECONDS").appendField("seconds");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#64748b");
    }
  };

  Blockly.Blocks.mars_repeat = {
    init() {
      this.appendDummyInput().appendField("repeat").appendField(new Blockly.FieldNumber(2, 1), "COUNT").appendField("times");
      this.appendStatementInput("DO").appendField("do");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#64748b");
    }
  };

  Blockly.Blocks.mars_if_then = {
    init() {
      this.appendValueInput("CONDITION").appendField("if");
      this.appendStatementInput("DO").appendField("then");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour("#64748b");
    }
  };
}

function blockToPython(block: Blockly.Block | null, indent = 0): string[] {
  if (!block) return [];

  const pad = " ".repeat(indent);
  const lines: string[] = [];

  switch (block.type) {
    case "mars_say":
      lines.push(`${pad}robot.say(${JSON.stringify(block.getFieldValue("TEXT"))})`);
      break;
    case "mars_move_forward":
      lines.push(`${pad}robot.move_forward(${block.getFieldValue("DISTANCE")})`);
      break;
    case "mars_move_backward":
      lines.push(`${pad}robot.move_backward(${block.getFieldValue("DISTANCE")})`);
      break;
    case "mars_turn_left":
      lines.push(`${pad}robot.turn_left(${block.getFieldValue("ANGLE")})`);
      break;
    case "mars_turn_right":
      lines.push(`${pad}robot.turn_right(${block.getFieldValue("ANGLE")})`);
      break;
    case "mars_set_speed":
      lines.push(`${pad}robot.set_speed(${block.getFieldValue("SPEED")})`);
      break;
    case "mars_wave":
      lines.push(`${pad}robot.arm.wave()`);
      break;
    case "mars_joint_position":
      lines.push(
        `${pad}robot.arm.set_joint_position(${JSON.stringify(block.getFieldValue("JOINT"))}, ${block.getFieldValue("VALUE")})`
      );
      break;
    case "mars_open_gripper":
      lines.push(`${pad}robot.gripper.open()`);
      break;
    case "mars_close_gripper":
      lines.push(`${pad}robot.gripper.close()`);
      break;
    case "mars_wait":
      lines.push(`${pad}robot.wait(${block.getFieldValue("SECONDS")})`);
      break;
    case "mars_repeat": {
      lines.push(`${pad}for _ in range(${block.getFieldValue("COUNT")}):`);
      const child = block.getInputTargetBlock("DO");
      lines.push(...(child ? blockToPython(child, indent + 4) : [`${pad}    pass`]));
      break;
    }
    case "mars_if_then": {
      const condition = block.getInputTargetBlock("CONDITION");
      const conditionCode = condition ? expressionForBlock(condition) : "True";
      lines.push(`${pad}if ${conditionCode}:`);
      const child = block.getInputTargetBlock("DO");
      lines.push(...(child ? blockToPython(child, indent + 4) : [`${pad}    pass`]));
      break;
    }
    default:
      break;
  }

  return [...lines, ...blockToPython(block.getNextBlock(), indent)];
}

function expressionForBlock(block: Blockly.Block): string {
  switch (block.type) {
    case "mars_get_distance":
      return "robot.sensors.get_distance()";
    case "mars_detect_object_color":
      return "robot.vision.detect_object_color()";
    case "mars_is_obstacle_ahead":
      return "robot.sensors.is_obstacle_ahead()";
    case "mars_listen":
      return "robot.speech.listen_for_command()";
    default:
      return "True";
  }
}

function generatePython(workspace: Blockly.WorkspaceSvg) {
  const topBlocks = workspace.getTopBlocks(true);
  const lines = [
    "from mars import robot",
    "",
    ...topBlocks.flatMap((block) => blockToPython(block)),
    "",
    "# Live robot execution coming soon."
  ];
  return lines.join("\n");
}

export function BlocklyWorkspace({
  exercise,
  onComplete
}: {
  exercise: Exercise;
  onComplete: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [pythonOpen, setPythonOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const setWorkspaceXml = useLessonStore((state) => state.setWorkspaceXml);
  const setGeneratedPython = useLessonStore((state) => state.setGeneratedPython);
  const workspaceXml = useLessonStore((state) => state.workspaceXml);
  const generatedPython = useLessonStore((state) => state.generatedPython);

  useEffect(() => {
    ensureBlocksDefined();
    if (!hostRef.current || workspaceRef.current) {
      return;
    }

    const workspace = Blockly.inject(hostRef.current, {
      toolbox,
      grid: {
        spacing: 24,
        length: 2,
        colour: "rgba(122, 116, 139, 0.18)",
        snap: true
      },
      zoom: {
        controls: false,
        wheel: true,
        startScale: 0.9,
        maxScale: 1.5,
        minScale: 0.6
      },
      move: {
        drag: true,
        scrollbars: true,
        wheel: true
      },
      trashcan: false,
      theme: Blockly.Theme.defineTheme("mars-studio", {
        name: "mars-studio",
        base: Blockly.Themes.Zelos,
        componentStyles: {
          workspaceBackgroundColour: "#ffffff",
          toolboxBackgroundColour: "#f6f4ef",
          toolboxForegroundColour: "#463f36",
          flyoutBackgroundColour: "#fcfbf8",
          flyoutForegroundColour: "#463f36",
          flyoutOpacity: 1,
          scrollbarColour: "#cfc6b8",
          insertionMarkerColour: "#d97706",
          insertionMarkerOpacity: 0.3
        }
      })
    });

    workspaceRef.current = workspace;

    const initialXml = workspaceXml || exercise.initialXml;
    if (initialXml) {
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(initialXml), workspace);
    }

    const sync = () => {
      const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
      const python = generatePython(workspace);
      setWorkspaceXml(xml);
      setGeneratedPython(python);
    };

    sync();
    workspace.addChangeListener(sync);

    const onResize = () => Blockly.svgResize(workspace);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [exercise.initialXml, exercise.title, setGeneratedPython, setWorkspaceXml, workspaceXml]);

  const hints = useMemo(() => exercise.hints, [exercise.hints]);

  return (
    <div className="h-[calc(100vh-108px)] min-h-[760px] overflow-hidden rounded-[20px] border border-[#ddd6cb] bg-[#f5f1e8] shadow-[0_28px_90px_-50px_rgba(59,41,16,0.3)]">
      <div
        className={`hidden h-full min-[900px]:grid ${
          pythonOpen ? "min-[900px]:grid-cols-[280px_minmax(0,1fr)_300px]" : "min-[900px]:grid-cols-[280px_minmax(0,1fr)_52px]"
        }`}
      >
        <aside className="flex min-h-0 flex-col border-r border-[#ddd6cb] bg-[#f8f5ef]">
          <div className="border-b border-[#ddd6cb] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b45309]">Exercise</div>
            <h2 className="mt-1 font-display text-xl leading-tight tracking-tight text-[#23180d]">{exercise.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#746657]">{exercise.prompt}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7b67]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Task
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#57493b]">
              {exercise.successCriteria.map((criterion) => (
                <li key={criterion} className="rounded-2xl border border-[#e1d9cc] bg-white px-3 py-2.5">
                  {criterion}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7b67]">
              <Lightbulb className="h-3.5 w-3.5 text-[#d97706]" />
              Hints
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#746657]">
              {hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#ddd6cb] p-4">
            <div className="grid gap-2">
              <Button
                className="gap-2"
                onClick={() => {
                  toast("Robot connection coming soon.");
                  // TODO: WebSocket robot execution architecture:
                  // Connect to ws://[robot-ip]:8765
                  // Send generated Python as JSON payload { code: "...", lessonId: "...", userId: "..." }
                  // Stream stdout / stderr messages back into the exercise console in real time.
                }}
              >
                <Play className="h-4 w-4" />
                Run on MARS
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onComplete();
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-h-0 bg-white">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-[#e7dfd3] px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b45309]">Coding Area</div>
                <div className="mt-1 text-sm text-[#746657]">Temporary workspace mockup for Blockly.</div>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-[#fdfcf9] p-0">
              <div ref={hostRef} className="h-full w-full bg-white" />
            </div>
          </div>
        </section>

        <aside className="grid h-full min-h-0 grid-rows-[52px_minmax(0,1fr)] border-l border-[#ddd6cb] bg-[#fbfaf7]">
          <div className="flex items-center justify-between border-b border-[#e3ddd2] px-3">
            {pythonOpen ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-[#3b3025]">
                  <Code2 className="h-4 w-4 text-[#d97706]" />
                  Python Preview
                </div>
                <button
                  type="button"
                  onClick={() => setPythonOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e1d9cc] bg-white text-[#7b6b5b] transition hover:border-[#d0c5b6] hover:text-[#3b3025]"
                  aria-label="Hide Python preview"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPythonOpen(true)}
                className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e1d9cc] bg-white text-[#7b6b5b] transition hover:border-[#d0c5b6] hover:text-[#3b3025]"
                aria-label="Show Python preview"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="min-h-0 p-0">
            {pythonOpen ? <PythonPreview code={generatedPython} /> : null}
          </div>
        </aside>
      </div>
      <div className="grid h-full place-items-center bg-[#f7f4ed] p-8 min-[900px]:hidden">
        <div className="max-w-sm text-center">
          <div className="font-display text-3xl tracking-tight text-text">Best experienced on desktop</div>
          <p className="mt-4 text-sm leading-7 text-muted">
            The Blockly exercise uses a workspace-first layout with the canvas and live code taking priority. Continue reading on mobile, then switch to a desktop or laptop for coding.
          </p>
        </div>
      </div>
    </div>
  );
}

function PythonPreview({ code }: { code: string }) {
  return (
    <div className="h-full overflow-hidden rounded-[20px] border border-[#e1d9cc] bg-white">
      <pre className="h-full overflow-auto px-4 py-4 font-mono text-[13px] leading-7 text-[#4b3d2f]">
        <code>{code || "# Blocks will generate Python here."}</code>
      </pre>
    </div>
  );
}
