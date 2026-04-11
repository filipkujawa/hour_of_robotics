"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Square, Wifi, Terminal, Code2, MessageCircle, CheckCircle2, Lightbulb, ChevronLeft, ChevronDown, Box, Camera } from "lucide-react";

import type { BlocklyExercise } from "@/lib/course-data";
import { useRobot } from "@/lib/robot";
import { registerAllBlocks } from "@/lib/blocks";
import { registerAllGenerators } from "@/lib/generators/python";
import { toolboxConfig } from "@/lib/blockly-config/toolbox";
import { RobotConsole } from "./robot-console";
import { ConnectDialog } from "./connect-dialog";
import { MarsChat } from "./mars-chat";
import { SimulationViewer } from "./rerun-viewer";
import { CameraFeedWidget } from "./camera-feed-widget";
import { simulationClient } from "@/lib/robot/simulation-client";
import { BlockExecutor } from "@/lib/robot/executor";

const g = globalThis as unknown as { __blocksRegistered?: boolean };

type LeftPanel = "exercise" | "chat";
type OutputTab = "console" | "rerun" | "camera";

export function BlocklyWorkspace({
  exercise,
  onBack,
  onComplete,
}: {
  exercise: BlocklyExercise;
  onBack: () => void;
  onComplete: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const [generatedPython, setGeneratedPython] = useState("");
  const [showCode, setShowCode] = useState(true);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("exercise");
  const [showConsole, setShowConsole] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHints, setShowHints] = useState(false);
  
  const [simulationUrl, setSimulationUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("console");
  const [outputHeight, setOutputHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const {
    status: connectionStatus,
    isRunning,
    logs,
    connect,
    disconnect,
    runWorkspace,
    stopExecution,
    clearLogs,
    connectionUrl,
  } = useRobot();

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setOutputHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleWorkspaceChange = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace || workspace.isDragging()) return;
    try {
      const code = pythonGenerator.workspaceToCode(workspace);
      const fullCode = code
        ? `from mars_sdk import Mars\n\nmars = Mars()\nmars.connect()\n\n${code}\nmars.disconnect()`
        : "";
      setGeneratedPython(fullCode);
    } catch {
      // ignore during drag
    }
  }, []);

  useEffect(() => {
    if (!hostRef.current || workspaceRef.current) return;

    if (!g.__blocksRegistered) {
      registerAllBlocks();
      registerAllGenerators();
      g.__blocksRegistered = true;
    }

    const workspace = Blockly.inject(hostRef.current, {
      toolbox: toolboxConfig,
      grid: { spacing: 28, length: 1, colour: "#eae9e7", snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.85, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      theme: Blockly.Theme.defineTheme("hourLight", {
        name: "hourLight",
        base: Blockly.Themes.Classic,
        blockStyles: {
          logic_blocks: { colourPrimary: "#6c5ce7", colourSecondary: "#5a4bd6", colourTertiary: "#4a3cc5" },
          loop_blocks: { colourPrimary: "#00b894", colourSecondary: "#00a884", colourTertiary: "#009874" },
          math_blocks: { colourPrimary: "#0984e3", colourSecondary: "#0874d3", colourTertiary: "#0764c3" },
          text_blocks: { colourPrimary: "#0984e3", colourSecondary: "#0874d3", colourTertiary: "#0764c3" },
          list_blocks: { colourPrimary: "#6c5ce7", colourSecondary: "#5a4bd6", colourTertiary: "#4a3cc5" },
          variable_blocks: { colourPrimary: "#e84393", colourSecondary: "#d63784", colourTertiary: "#c42b75" },
          procedure_blocks: { colourPrimary: "#a55eea", colourSecondary: "#9550d8", colourTertiary: "#8540c6" },
        },
        categoryStyles: {
          logic_category: { colour: "#6c5ce7" },
          loop_category: { colour: "#00b894" },
          math_category: { colour: "#0984e3" },
          text_category: { colour: "#0984e3" },
          list_category: { colour: "#6c5ce7" },
          variable_category: { colour: "#e84393" },
          procedure_category: { colour: "#a55eea" },
        },
        componentStyles: {
          workspaceBackgroundColour: "#fafaf9",
          toolboxBackgroundColour: "#f5f3ef",
          toolboxForegroundColour: "#6b6b69",
          flyoutBackgroundColour: "#f0efed",
          flyoutForegroundColour: "#1a1a19",
          flyoutOpacity: 0.98,
          scrollbarColour: "#d4d3d0",
          insertionMarkerColour: "#d97706",
          insertionMarkerOpacity: 0.5,
          scrollbarOpacity: 0.4,
          cursorColour: "#d97706",
        },
        fontStyle: {
          family: "var(--font-dm-sans), -apple-system, sans-serif",
          weight: "500",
          size: 11,
        },
      }),
      renderer: "zelos",
    });

    workspaceRef.current = workspace;
    workspace.addChangeListener(handleWorkspaceChange);

    // Patch toolbox so clicking the selected category toggles the flyout closed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolbox = workspace.getToolbox() as any;
    if (toolbox) {
      const origSetSelectedItem = toolbox.setSelectedItem.bind(toolbox);
      toolbox.setSelectedItem = (newItem: unknown) => {
        const oldItem = toolbox.selectedItem_;
        if (oldItem && oldItem === newItem) {
          // Same category clicked again — deselect & close flyout
          oldItem.setSelected(false);
          toolbox.selectedItem_ = null;
          toolbox.updateFlyout_(oldItem, null);
          toolbox.fireSelectEvent(oldItem, null);
          return;
        }
        origSetSelectedItem(newItem);
      };
    }

    if (exercise.initialXml) {
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(exercise.initialXml), workspace);
      } catch {
        // ignore invalid XML
      }
    }

    const onResize = () => Blockly.svgResize(workspace);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      workspace.removeChangeListener(handleWorkspaceChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [exercise.initialXml, handleWorkspaceChange]);

  useEffect(() => {
    setShowHints(false);
  }, [exercise.title]);

  const handleRun = () => {
    if (connectionStatus !== "connected") {
      setConnectOpen(true);
      return;
    }
    if (workspaceRef.current) {
      setShowConsole(true);
      setActiveOutputTab("console");
      runWorkspace(workspaceRef.current);
    }
  };

  // Pre-load the robot model so Rerun never shows the welcome screen
  useEffect(() => {
    simulationClient.simulate([]).then(({ rerunUrl }) => {
      setSimulationUrl(rerunUrl);
    }).catch(() => {
      // Simulation backend not running — that's fine
    });
  }, []);

  const [simVersion, setSimVersion] = useState(0);

  const handleSimulate = async () => {
    if (!workspaceRef.current) return;

    setIsSimulating(true);
    setShowConsole(true);
    setActiveOutputTab("rerun");
    try {
      const blocks = BlockExecutor.serializeWorkspace(workspaceRef.current);
      const { rerunUrl } = await simulationClient.simulate(blocks);
      setSimulationUrl(rerunUrl);
      setSimVersion((v) => v + 1);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenCameras = () => {
    setShowConsole(true);
    setActiveOutputTab("camera");
    if (connectionStatus !== "connected") {
      setConnectOpen(true);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPython);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen fixed inset-0 z-50 flex flex-col bg-[#f5f5f4] text-[#1a1a19] overflow-hidden">
      <header className="h-11 flex items-center justify-between px-4 bg-white border-b border-[#e2e1de] flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] text-[#9c9c9a] transition-colors hover:text-[#6b6b69]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to lesson
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <span className="text-[12px] font-semibold text-[#1a1a19] truncate max-w-[200px]">{exercise.title}</span>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <nav className="flex items-center gap-0.5 bg-[#f0efed] rounded-md p-0.5">
            <button onClick={() => setLeftPanel("exercise")} className={`text-[11px] font-medium px-3 py-1 rounded transition-all ${leftPanel === "exercise" ? "bg-white text-[#1a1a19] shadow-sm" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
              Exercise
            </button>
            <button onClick={() => setLeftPanel("chat")} className={`text-[11px] font-medium px-3 py-1 rounded transition-all flex items-center gap-1.5 ${leftPanel === "chat" ? "bg-white text-[#1a1a19] shadow-sm" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
              <MessageCircle className="h-3 w-3" />
              Ask Mars
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => { Blockly.DropDownDiv.hideWithoutAnimation(); setConnectOpen(true); }} className="flex items-center gap-1.5 hover:bg-[#fafaf9] px-2 py-1 rounded transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" : connectionStatus === "error" ? "bg-red-500" : "bg-[#d4d3d0]"}`} />
            <Wifi className="h-3 w-3 text-[#9c9c9a]" />
            <span className="text-[11px] text-[#9c9c9a]">{connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting" : "Offline"}</span>
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <button onClick={() => setShowConsole(!showConsole)} className={`text-[11px] px-2 py-1 rounded flex items-center gap-1.5 transition-all ${showConsole ? "bg-[#f0efed] text-[#1a1a19]" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
            <Terminal className="h-3 w-3" />
            {logs.length > 0 ? `${logs.length}` : ""}
          </button>
          <button onClick={() => setShowCode(!showCode)} className={`text-[11px] px-2 py-1 rounded flex items-center gap-1.5 transition-all ${showCode ? "bg-[#f0efed] text-[#1a1a19]" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
            <Code2 className="h-3 w-3" />
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <button onClick={onComplete} className="text-[11px] font-medium px-3 py-1 rounded-md bg-[#1a1a19] text-white hover:bg-[#333] transition-colors">Submit</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] flex-shrink-0 bg-white border-r border-[#e2e1de] flex flex-col overflow-hidden">
          {leftPanel === "exercise" ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-[#f0efed]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d97706]">Exercise</div>
                <p className="mt-2 text-[12px] text-[#6b6b69] leading-relaxed">{exercise.prompt}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9c9c9a] mb-2">
                  <CheckCircle2 className="h-3 w-3" /> Tasks
                </div>
                <ul className="space-y-1.5">
                  {exercise.successCriteria.map((c) => (
                    <li key={c} className="text-[11px] text-[#6b6b69] leading-relaxed rounded-lg bg-[#fafaf9] border border-[#f0efed] px-3 py-2">{c}</li>
                  ))}
                </ul>
                {exercise.hints.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowHints((current) => !current)}
                      className="mt-5 mb-2 flex w-full items-center justify-between rounded-lg border border-[#f0efed] bg-[#fafaf9] px-3 py-2 text-left transition-colors hover:bg-white"
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9c9c9a]">
                        <Lightbulb className="h-3 w-3 text-[#d97706]" />
                        Hints
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#9c9c9a] transition-transform ${showHints ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showHints && (
                      <ul className="space-y-1 text-[11px] text-[#9c9c9a] leading-relaxed">
                        {exercise.hints.map((h) => (<li key={h}>{h}</li>))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t border-[#e2e1de] space-y-2">
                <button
                  onClick={handleOpenCameras}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#f7f4ee] hover:bg-[#f2eee6] text-[#1a1a19] border border-[#e2d8ca] rounded-md font-semibold text-[12px] transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-[#d97706]" />
                  View Cameras
                </button>

                <button 
                  onClick={handleSimulate} 
                  disabled={isSimulating}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-[#fafaf9] text-[#1a1a19] border border-[#e2e1de] rounded-md font-semibold text-[12px] transition-colors ${isSimulating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Box className="h-3.5 w-3.5 text-[#d97706]" /> 
                  {isSimulating ? "Simulating..." : "Simulate 3D"}
                </button>

                {!isRunning ? (
                  <button onClick={handleRun} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a19] hover:bg-[#333] text-white rounded-md font-semibold text-[12px] transition-colors">
                    <Play className="h-3.5 w-3.5" /> Run on MARS
                  </button>
                ) : (
                  <button onClick={stopExecution} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-[12px] transition-colors">
                    <Square className="h-3 w-3" /> Stop
                  </button>
                )}
              </div>
            </div>
          ) : (
            <MarsChat exercisePrompt={exercise.prompt} />
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden">
            <div ref={hostRef} className="h-full w-full" />
          </div>
          
          {showConsole && (
            <div 
              style={{ height: `${outputHeight}px` }} 
              className="flex-shrink-0 border-t border-[#e2e1de] bg-white flex flex-col overflow-hidden relative"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-[#d97706]/30 transition-colors z-20"
                onMouseDown={startResizing}
              />

              <div className="flex items-center justify-between px-4 h-9 border-b border-[#f0efed] bg-white">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveOutputTab("console")}
                    className={`px-3 h-9 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeOutputTab === "console" ? "border-[#d97706] text-[#1a1a19]" : "border-transparent text-[#9c9c9a] hover:text-[#6b6b69]"}`}
                  >
                    <Terminal className="h-3 w-3" />
                    Console
                  </button>
                  <button
                    onClick={() => setActiveOutputTab("rerun")}
                    className={`px-3 h-9 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeOutputTab === "rerun" ? "border-[#d97706] text-[#1a1a19]" : "border-transparent text-[#9c9c9a] hover:text-[#6b6b69]"}`}
                  >
                    <Box className="h-3 w-3" />
                    Simulation
                  </button>
                  <button
                    onClick={() => setActiveOutputTab("camera")}
                    className={`px-3 h-9 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeOutputTab === "camera" ? "border-[#d97706] text-[#1a1a19]" : "border-transparent text-[#9c9c9a] hover:text-[#6b6b69]"}`}
                  >
                    <Camera className="h-3 w-3" />
                    Camera Feed
                  </button>
                </div>
                <button 
                  onClick={() => setShowConsole(false)}
                  className="p-1.5 hover:bg-[#f0efed] rounded-md transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-[#9c9c9a]" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden bg-[#fafaf9]">
                {activeOutputTab === "console" ? (
                  <div className="h-full p-2">
                    <RobotConsole logs={logs} onClear={clearLogs} />
                  </div>
                ) : activeOutputTab === "rerun" ? (
                  <div className="h-full p-2">
                    <SimulationViewer url={simulationUrl} version={simVersion} className="h-full" />
                  </div>
                ) : (
                  <div className="h-full p-2">
                    <CameraFeedWidget
                      wsUrl={connectionUrl}
                      isRobotConnected={connectionStatus === "connected"}
                      active={activeOutputTab === "camera" && showConsole}
                      className="h-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showCode && (
          <div className="w-[380px] flex-shrink-0 flex flex-col bg-white border-l border-[#e2e1de]">
            <div className="flex items-center justify-between px-3 h-9 border-b border-[#e2e1de]">
              <div className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-[#9c9c9a]" />
                <span className="text-[11px] font-mono text-[#9c9c9a]">output.py</span>
              </div>
              <button onClick={handleCopy} className="text-[10px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors">{copied ? "Copied" : "Copy"}</button>
            </div>
            <div className="flex-1 overflow-auto bg-[#fafaf9]">
              {generatedPython ? (
                <SyntaxHighlighter language="python" style={githubGist} customStyle={{ background: "#fafaf9", padding: "12px", margin: 0, fontSize: "11px", lineHeight: "1.75", height: "100%", fontFamily: "var(--font-mono), monospace" }} showLineNumbers lineNumberStyle={{ color: "#d4d3d0", minWidth: "2em", fontSize: "10px" }}>
                  {generatedPython}
                </SyntaxHighlighter>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[11px] text-[#d4d3d0]">Drag blocks to generate code</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConnectDialog isOpen={connectOpen} status={connectionStatus} onConnect={connect} onDisconnect={disconnect} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
