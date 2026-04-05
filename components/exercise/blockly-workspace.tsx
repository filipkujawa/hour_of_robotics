"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Square, Wifi, Terminal, Code2, MessageCircle, CheckCircle2, Lightbulb, ChevronLeft } from "lucide-react";
import Link from "next/link";

import type { Exercise } from "@/lib/course-data";
import { useRobot } from "@/lib/robot";
import { registerAllBlocks } from "@/lib/blocks";
import { registerAllGenerators } from "@/lib/generators/python";
import { toolboxConfig } from "@/lib/blockly-config/toolbox";
import { RobotConsole } from "./robot-console";
import { ConnectDialog } from "./connect-dialog";
import { MarsChat } from "./mars-chat";

let registered = false;

type LeftPanel = "exercise" | "chat";

export function BlocklyWorkspace({ exercise, onComplete }: { exercise: Exercise; onComplete: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const [generatedPython, setGeneratedPython] = useState("");
  const [showCode, setShowCode] = useState(true);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("exercise");
  const [showConsole, setShowConsole] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { status: connectionStatus, isRunning, logs, connect, disconnect, runWorkspace, stopExecution, clearLogs } = useRobot();

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

    if (!registered) {
      registerAllBlocks();
      registerAllGenerators();
      registered = true;
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

    // Load initial XML if provided
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

  const handleRun = () => {
    if (connectionStatus !== "connected") {
      setConnectOpen(true);
      return;
    }
    if (workspaceRef.current) {
      setShowConsole(true);
      runWorkspace(workspaceRef.current);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPython);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen fixed inset-0 z-50 flex flex-col bg-[#f5f5f4] text-[#1a1a19] overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="h-11 flex items-center justify-between px-4 bg-white border-b border-[#e2e1de] flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/learn" className="flex items-center gap-1.5 text-[11px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
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
          <button onClick={() => setConnectOpen(true)} className="flex items-center gap-1.5 hover:bg-[#fafaf9] px-2 py-1 rounded transition-colors">
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

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
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
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9c9c9a] mt-5 mb-2">
                      <Lightbulb className="h-3 w-3 text-[#d97706]" /> Hints
                    </div>
                    <ul className="space-y-1 text-[11px] text-[#9c9c9a] leading-relaxed">
                      {exercise.hints.map((h) => (<li key={h}>{h}</li>))}
                    </ul>
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t border-[#e2e1de]">
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

        {/* Center: Blockly + Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div ref={hostRef} className="h-full w-full" />
          </div>
          {showConsole && (
            <div className="h-[180px] flex-shrink-0 border-t border-[#e2e1de]">
              <RobotConsole logs={logs} onClear={clearLogs} />
            </div>
          )}
        </div>

        {/* Right: Code preview */}
        {showCode && (
          <div className="w-[300px] flex-shrink-0 flex flex-col bg-white border-l border-[#e2e1de]">
            <div className="flex items-center justify-between px-3 h-9 border-b border-[#e2e1de]">
              <span className="text-[11px] font-mono text-[#9c9c9a]">output.py</span>
              <button onClick={handleCopy} className="text-[10px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors">{copied ? "Copied" : "Copy"}</button>
            </div>
            <div className="flex-1 overflow-auto bg-[#fafaf9]">
              {generatedPython ? (
                <SyntaxHighlighter language="python" style={githubGist} customStyle={{ background: "#fafaf9", padding: "12px", margin: 0, fontSize: "12px", lineHeight: "1.75", height: "100%", fontFamily: "var(--font-mono), monospace" }} showLineNumbers lineNumberStyle={{ color: "#d4d3d0", minWidth: "2em", fontSize: "10px" }}>
                  {generatedPython}
                </SyntaxHighlighter>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[12px] text-[#d4d3d0]">Drag blocks to generate code</p>
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
