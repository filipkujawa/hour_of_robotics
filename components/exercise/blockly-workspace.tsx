"use client";

import { useEffect, useRef, useState, useCallback, type DragEvent } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Square, Wifi, Terminal, Code2, MessageCircle, CheckCircle2, Lightbulb, ChevronLeft, ChevronDown, Box, Download, Upload, Camera } from "lucide-react";

import type { BlocklyExercise } from "@/lib/course-data";
import { useRobot } from "@/lib/robot";
import { registerAllBlocks } from "@/lib/blocks";
import { registerAllGenerators } from "@/lib/generators/python";
import { toolboxConfig } from "@/lib/blockly-config/toolbox";
import { updateAvailableSkills } from "@/lib/blocks/wait";
import { RobotConsole } from "./robot-console";
import { ConnectDialog } from "./connect-dialog";
import { MarsChat } from "./mars-chat";
import { SimulationViewer } from "./rerun-viewer";
import { CameraFeedWidget } from "./camera-feed-widget";
import { simulationClient } from "@/lib/robot/simulation-client";
import { BlockExecutor } from "@/lib/robot/executor";

const g = globalThis as unknown as { __blocksRegistered?: boolean };

type LeftPanel = "exercise" | "chat";
type WidgetId = "console" | "rerun" | "camera" | "python";
type PaneId = "bottom" | "right";

const DEFAULT_WIDGET_LAYOUT: Record<PaneId, WidgetId[]> = {
  bottom: ["console", "rerun", "camera"],
  right: ["python"],
};

const DEFAULT_ACTIVE_WIDGET: Record<PaneId, WidgetId | null> = {
  bottom: "console",
  right: "python",
};

const WIDGET_META: Record<WidgetId, { label: string; icon: typeof Terminal }> = {
  console: { label: "Console", icon: Terminal },
  rerun: { label: "Simulation", icon: Box },
  camera: { label: "Camera Feed", icon: Camera },
  python: { label: "Python", icon: Code2 },
};

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
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("exercise");
  const [connectOpen, setConnectOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [simulationUrl, setSimulationUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [outputHeight, setOutputHeight] = useState(240);
  const [rightPaneWidth, setRightPaneWidth] = useState(380);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [widgetsByPane, setWidgetsByPane] = useState<Record<PaneId, WidgetId[]>>(DEFAULT_WIDGET_LAYOUT);
  const [activeWidgetByPane, setActiveWidgetByPane] = useState<Record<PaneId, WidgetId | null>>(DEFAULT_ACTIVE_WIDGET);
  const [visiblePanes, setVisiblePanes] = useState<Record<PaneId, boolean>>({ bottom: true, right: true });
  const [draggingWidget, setDraggingWidget] = useState<WidgetId | null>(null);

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
    fetchSkills,
  } = useRobot();

  const [loadingSkills, setLoadingSkills] = useState(false);

  const handleFetchSkills = async () => {
    if (connectionStatus !== "connected") {
      setConnectOpen(true);
      return;
    }
    setLoadingSkills(true);
    const skills = await fetchSkills();
    updateAvailableSkills(skills);
    setLoadingSkills(false);
  };

  const startBottomResizing = useCallback(() => setIsResizingBottom(true), []);
  const startRightResizing = useCallback(() => setIsResizingRight(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingBottom(false);
    setIsResizingRight(false);
  }, []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizingBottom) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setOutputHeight(newHeight);
      }
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 260 && newWidth < window.innerWidth * 0.65) {
        setRightPaneWidth(newWidth);
      }
    }
  }, [isResizingBottom, isResizingRight]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    Blockly.svgResize(workspace);
  }, [outputHeight, rightPaneWidth, visiblePanes.bottom, visiblePanes.right]);

  const findWidgetPane = useCallback(
    (widgetId: WidgetId) =>
      (Object.entries(widgetsByPane).find(([, widgetIds]) => widgetIds.includes(widgetId))?.[0] as PaneId | undefined) ?? null,
    [widgetsByPane],
  );

  const setActiveWidget = useCallback((paneId: PaneId, widgetId: WidgetId | null) => {
    setActiveWidgetByPane((current) => ({ ...current, [paneId]: widgetId }));
  }, []);

  const focusWidget = useCallback(
    (widgetId: WidgetId) => {
      const paneId = findWidgetPane(widgetId);
      if (!paneId) return;

      setVisiblePanes((current) => ({ ...current, [paneId]: true }));
      setActiveWidget(paneId, widgetId);
    },
    [findWidgetPane, setActiveWidget],
  );

  const moveWidget = useCallback((widgetId: WidgetId, targetPaneId: PaneId, targetIndex?: number) => {
    setWidgetsByPane((current) => {
      const sourcePaneId =
        (Object.entries(current).find(([, widgetIds]) => widgetIds.includes(widgetId))?.[0] as PaneId | undefined) ?? null;
      if (!sourcePaneId) return current;

      const next: Record<PaneId, WidgetId[]> = {
        bottom: current.bottom.filter((id) => id !== widgetId),
        right: current.right.filter((id) => id !== widgetId),
      };

      const destination = [...next[targetPaneId]];
      const insertIndex =
        typeof targetIndex === "number" ? Math.max(0, Math.min(targetIndex, destination.length)) : destination.length;
      destination.splice(insertIndex, 0, widgetId);
      next[targetPaneId] = destination;

      setActiveWidgetByPane((currentActive) => {
        const nextActive = { ...currentActive };
        const sourceWidgets = next[sourcePaneId];
        const targetWidgets = next[targetPaneId];

        if (!sourceWidgets.includes(nextActive[sourcePaneId] as WidgetId)) {
          nextActive[sourcePaneId] = sourceWidgets[0] ?? null;
        }
        nextActive[targetPaneId] = widgetId;

        return nextActive;
      });

      setVisiblePanes((currentVisible) => ({
        ...currentVisible,
        [targetPaneId]: true,
      }));

      return next;
    });
  }, []);

  const handlePaneDrop = useCallback(
    (event: DragEvent<HTMLElement>, paneId: PaneId, targetIndex?: number) => {
      event.preventDefault();
      const widgetId = event.dataTransfer.getData("text/widget-id") as WidgetId;
      if (!widgetId) return;

      moveWidget(widgetId, paneId, targetIndex);
      setDraggingWidget(null);
    },
    [moveWidget],
  );

  const handlePaneDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

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

    // Inject toolbox style overrides AFTER Blockly so they win over Blockly's injected CSS
    if (!document.getElementById("blockly-toolbox-overrides")) {
      const style = document.createElement("style");
      style.id = "blockly-toolbox-overrides";
      style.textContent = `
        .blocklyToolboxCategory {
          height: auto !important;
          padding: 7px 10px 7px 12px !important;
          margin: 1px 6px !important;
          border-radius: 6px !important;
          line-height: 1.2 !important;
          transition: background-color 0.1s ease !important;
          border-left-width: 3px !important;
          border-left-style: solid !important;
          border-top: none !important;
          border-right: none !important;
          border-bottom: none !important;
        }
        .blocklyToolboxCategory:not(.blocklyToolboxSelected):hover {
          background-color: #f0efed !important;
        }
        .blocklyToolboxSelected {
          background-color: #eeeeec !important;
        }
        .blocklyToolboxCategoryIcon {
          display: none !important;
        }
        .blocklyToolboxCategoryLabel {
          font-size: 13px !important;
          font-weight: 500 !important;
          font-family: var(--font-dm-sans), -apple-system, sans-serif !important;
          color: #6b6b69 !important;
          cursor: pointer !important;
          padding: 0 !important;
        }
        .blocklyToolboxCategory:hover .blocklyToolboxCategoryLabel {
          color: #1a1a19 !important;
        }
        .blocklyToolboxSelected .blocklyToolboxCategoryLabel {
          color: #1a1a19 !important;
          font-weight: 600 !important;
        }
        .blocklyTreeSeparator {
          border-bottom: 1px solid #e8e6e2 !important;
          margin: 6px 14px !important;
        }
      `;
      document.head.appendChild(style);
    }

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
      focusWidget("console");
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
    focusWidget("rerun");
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
    focusWidget("camera");
    if (connectionStatus !== "connected") {
      setConnectOpen(true);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPython);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-save to localStorage on every workspace change
  const storageKey = `mars_blocks_${exercise.title}`;

  const saveToLocalStorage = useCallback(() => {
    if (!workspaceRef.current) return;
    const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
    const xmlText = Blockly.Xml.domToText(xml);
    localStorage.setItem(storageKey, xmlText);
  }, [storageKey]);

  // Hook into workspace changes to auto-save
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const listener = () => saveToLocalStorage();
    ws.addChangeListener(listener);
    return () => ws.removeChangeListener(listener);
  }, [saveToLocalStorage]);

  // Load from localStorage on mount (after workspace is ready)
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        ws.clear();
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(saved), ws);
      } catch {
        // corrupt save — ignore
      }
    }
  }, [storageKey]);

  const handleExport = () => {
    if (!workspaceRef.current) return;
    const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
    const xmlText = Blockly.Xml.domToPrettyText(xml);
    const blob = new Blob([xmlText], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mars-blocks-${exercise.title.replace(/\s+/g, "-").toLowerCase()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !workspaceRef.current) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const xml = Blockly.utils.xml.textToDom(reader.result as string);
          workspaceRef.current!.clear();
          Blockly.Xml.domToWorkspace(xml, workspaceRef.current!);
        } catch {
          alert("Invalid block file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const consolePane = findWidgetPane("console");
  const pythonPane = findWidgetPane("python");
  const isCameraWidgetActive = (() => {
    const paneId = findWidgetPane("camera");
    return paneId !== null && visiblePanes[paneId] && activeWidgetByPane[paneId] === "camera";
  })();

  const renderWidgetContent = (widgetId: WidgetId) => {
    switch (widgetId) {
      case "console":
        return <RobotConsole logs={logs} onClear={clearLogs} />;
      case "rerun":
        return <SimulationViewer url={simulationUrl} version={simVersion} className="h-full" />;
      case "camera":
        return (
          <CameraFeedWidget
            wsUrl={connectionUrl}
            isRobotConnected={connectionStatus === "connected"}
            active={isCameraWidgetActive}
            className="h-full"
          />
        );
      case "python":
        return generatedPython ? (
          <SyntaxHighlighter
            language="python"
            style={githubGist}
            customStyle={{
              background: "#fafaf9",
              padding: "12px",
              margin: 0,
              fontSize: "11px",
              lineHeight: "1.75",
              height: "100%",
              fontFamily: "var(--font-mono), monospace",
            }}
            showLineNumbers
            lineNumberStyle={{ color: "#d4d3d0", minWidth: "2em", fontSize: "10px" }}
          >
            {generatedPython}
          </SyntaxHighlighter>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[11px] text-[#d4d3d0]">Drag blocks to generate code</p>
          </div>
        );
    }
  };

  const renderWidgetPane = ({
    paneId,
    className,
    bodyClassName,
    title,
  }: {
    paneId: PaneId;
    className: string;
    bodyClassName: string;
    title: string;
  }) => {
    const widgetIds = widgetsByPane[paneId];
    const activeWidget = activeWidgetByPane[paneId] && widgetIds.includes(activeWidgetByPane[paneId] as WidgetId)
      ? (activeWidgetByPane[paneId] as WidgetId)
      : (widgetIds[0] ?? null);
    const showCopyButton = activeWidget === "python";

    return (
      <div className={className}>
        <div
          className="flex items-center justify-between border-b border-[#f0efed] bg-white px-4 h-9"
          onDragOver={handlePaneDragOver}
          onDrop={(event) => handlePaneDrop(event, paneId)}
        >
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {widgetIds.map((widgetId, index) => {
              const meta = WIDGET_META[widgetId];
              const Icon = meta.icon;

              return (
                <button
                  key={widgetId}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/widget-id", widgetId);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingWidget(widgetId);
                  }}
                  onDragEnd={() => setDraggingWidget(null)}
                  onDragOver={handlePaneDragOver}
                  onDrop={(event) => handlePaneDrop(event, paneId, index)}
                  onClick={() => setActiveWidget(paneId, widgetId)}
                  className={`px-3 h-9 shrink-0 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeWidget === widgetId
                      ? "border-[#d97706] text-[#1a1a19]"
                      : "border-transparent text-[#9c9c9a] hover:text-[#6b6b69]"
                  } ${draggingWidget === widgetId ? "opacity-50" : ""}`}
                  title={`Drag ${meta.label} to another pane`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
            {widgetIds.length === 0 && (
              <div className="px-3 text-[11px] text-[#b4b1ab]">{title}</div>
            )}
          </div>
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="px-2 text-[10px] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        <div
          className={bodyClassName}
          onDragOver={handlePaneDragOver}
          onDrop={(event) => handlePaneDrop(event, paneId)}
        >
          {activeWidget ? (
            <div className="h-full p-2">{renderWidgetContent(activeWidget)}</div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-[#9c9c9a]">
              Drag a widget here to populate this pane.
            </div>
          )}
        </div>
      </div>
    );
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
          <button onClick={handleExport} className="text-[#9c9c9a] hover:text-[#6b6b69] p-1 rounded transition-colors" title="Export blocks">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleImport} className="text-[#9c9c9a] hover:text-[#6b6b69] p-1 rounded transition-colors" title="Import blocks">
            <Upload className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <button onClick={() => focusWidget("console")} className={`text-[11px] px-2 py-1 rounded flex items-center gap-1.5 transition-all ${consolePane && visiblePanes[consolePane] ? "bg-[#f0efed] text-[#1a1a19]" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
            <Terminal className="h-3 w-3" />
            {logs.length > 0 ? `${logs.length}` : ""}
          </button>
          <button onClick={() => focusWidget("python")} className={`text-[11px] px-2 py-1 rounded flex items-center gap-1.5 transition-all ${pythonPane && visiblePanes[pythonPane] ? "bg-[#f0efed] text-[#1a1a19]" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
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
                  onClick={handleFetchSkills}
                  disabled={loadingSkills}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#f0efed] hover:bg-[#e8e7e4] text-[#1a1a19] border border-[#e2e1de] rounded-md font-semibold text-[12px] transition-colors"
                >
                  {loadingSkills ? "Fetching skills..." : "Refresh Robot Skills"}
                </button>

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
          
          {visiblePanes.bottom && (
            <div 
              style={{ height: `${outputHeight}px` }} 
              className="flex-shrink-0 border-t border-[#e2e1de] bg-white flex flex-col overflow-hidden relative"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-[#d97706]/30 transition-colors z-20"
                onMouseDown={startBottomResizing}
              />

              {renderWidgetPane({
                paneId: "bottom",
                className: "flex h-full flex-col overflow-hidden",
                bodyClassName: "flex-1 overflow-hidden bg-[#fafaf9]",
                title: "Bottom widget pane",
              })}
            </div>
          )}
        </div>

        {visiblePanes.right && (
          <div
            style={{ width: `${rightPaneWidth}px` }}
            className="relative flex-shrink-0"
          >
            <div
              className="absolute bottom-0 left-0 top-0 w-1 cursor-ew-resize hover:bg-[#d97706]/30 transition-colors z-20"
              onMouseDown={startRightResizing}
            />
            {renderWidgetPane({
              paneId: "right",
              className: "h-full flex flex-col bg-white border-l border-[#e2e1de]",
              bodyClassName: "flex-1 overflow-auto bg-[#fafaf9]",
              title: "Right widget pane",
            })}
          </div>
        )}
      </div>

      <ConnectDialog isOpen={connectOpen} status={connectionStatus} onConnect={connect} onDisconnect={disconnect} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
