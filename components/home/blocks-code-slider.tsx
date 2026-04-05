"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { pythonGenerator } from "blockly/python";
import { registerAllBlocks } from "@/lib/blocks";
import { registerAllGenerators } from "@/lib/generators/python";
import { Code2, Puzzle } from "lucide-react";

const g = globalThis as unknown as { __blocksRegistered?: boolean };

const DEMO_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="mars_say" x="30" y="30">
    <field name="TEXT">Starting patrol!</field>
    <next>
      <block type="controls_repeat_ext">
        <value name="TIMES">
          <block type="math_number">
            <field name="NUM">4</field>
          </block>
        </value>
        <statement name="DO">
          <block type="mars_move_forward">
            <field name="STEPS">3</field>
            <next>
              <block type="mars_turn">
                <field name="DIRECTION">RIGHT</field>
                <field name="DEGREES">90</field>
              </block>
            </next>
          </block>
        </statement>
        <next>
          <block type="mars_wave">
            <next>
              <block type="mars_say">
                <field name="TEXT">Patrol complete!</field>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;

export function BlocksCodeSlider() {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [python, setPython] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateCode = useCallback(() => {
    if (!workspaceRef.current) return;
    try {
      const code = pythonGenerator.workspaceToCode(workspaceRef.current);
      const full = code
        ? `from mars_sdk import Mars\n\nmars = Mars()\nmars.connect()\n\n${code}\nmars.disconnect()`
        : "";
      setPython(full);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!blocklyRef.current || workspaceRef.current) return;

    if (!g.__blocksRegistered) {
      registerAllBlocks();
      registerAllGenerators();
      g.__blocksRegistered = true;
    }

    const workspace = Blockly.inject(blocklyRef.current, {
      readOnly: true,
      scrollbars: false,
      zoom: { controls: false, wheel: false, startScale: 0.72 },
      move: { drag: false, scrollbars: false, wheel: false },
      trashcan: false,
      theme: Blockly.Theme.defineTheme("heroTheme", {
        name: "heroTheme",
        base: Blockly.Themes.Classic,
        componentStyles: {
          workspaceBackgroundColour: "#fafaf9",
          flyoutBackgroundColour: "#fafaf9",
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

    try {
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(DEMO_XML),
        workspace
      );
    } catch {
      // ignore
    }

    generateCode();

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [generateCode]);

  // Drag to flip — track drag distance then snap
  useEffect(() => {
    const onMouseUp = () => {
      if (dragStartX !== null && containerRef.current) {
        setDragStartX(null);
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [dragStartX]);

  const handleDragStart = (clientX: number) => {
    setDragStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (dragStartX === null) return;
    const delta = clientX - dragStartX;
    // If dragged more than 60px, flip
    if (Math.abs(delta) > 60) {
      setShowCode(delta > 0 ? !showCode : showCode);
      setDragStartX(null);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-[#e2e1de]" style={{ height: 420 }}>
      {/* Blocks layer */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showCode ? "-translate-x-full opacity-0 scale-95" : "translate-x-0 opacity-100 scale-100"
        }`}
      >
        <div className="absolute inset-0 bg-[#fafaf9]">
          <div ref={blocklyRef} className="h-full w-full" />
        </div>
      </div>

      {/* Code layer */}
      <div
        className={`absolute inset-0 bg-white transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showCode ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
        }`}
      >
        <div className="h-full overflow-auto px-8 py-6">
          {python ? (
            <SyntaxHighlighter
              language="python"
              style={githubGist}
              customStyle={{
                background: "transparent",
                padding: 0,
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.85",
                fontFamily: "var(--font-mono), monospace",
              }}
              showLineNumbers
              lineNumberStyle={{
                color: "#d4d3d0",
                minWidth: "2.5em",
                fontSize: "11px",
              }}
            >
              {python}
            </SyntaxHighlighter>
          ) : (
            <div className="text-[12px] text-[#d4d3d0]">Loading...</div>
          )}
        </div>
      </div>

      {/* Toggle / drag handle — bottom center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setShowCode(!showCode)}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          className="flex items-center gap-2 rounded-full bg-[#1a1a19] pl-2 pr-4 py-2 shadow-lg hover:bg-[#333] transition-colors cursor-grab active:cursor-grabbing select-none"
        >
          {/* Pill indicator */}
          <div className="relative flex items-center bg-[#333] rounded-full p-0.5 w-[52px] h-[24px]">
            <div
              className={`absolute w-[20px] h-[20px] rounded-full bg-white shadow transition-transform duration-300 ${
                showCode ? "translate-x-[28px]" : "translate-x-[2px]"
              }`}
            />
            <Puzzle className={`relative z-10 h-3 w-3 ml-[5px] transition-colors ${showCode ? "text-[#666]" : "text-[#1a1a19]"}`} />
            <Code2 className={`relative z-10 h-3 w-3 ml-[11px] transition-colors ${showCode ? "text-[#1a1a19]" : "text-[#666]"}`} />
          </div>
          <span className="text-[12px] font-medium text-white">
            {showCode ? "Viewing Python" : "Viewing Blocks"}
          </span>
        </button>
      </div>
    </div>
  );
}
