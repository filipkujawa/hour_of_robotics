"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/robot";

export function RobotConsole({
  logs,
  onClear,
  onClearFaults,
  onTorqueOn,
  onTorqueOff,
  onEnableMicInput,
  armEstopped,
}: {
  logs: LogEntry[];
  onClear: () => void;
  onClearFaults?: () => void;
  onTorqueOn?: () => void;
  onTorqueOff?: () => void;
  onEnableMicInput?: () => void;
  armEstopped?: boolean | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#e1d9cc] bg-[#1e1c19] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2e2b25] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium text-[#8a7d6d]">
            console
          </span>
          {armEstopped !== undefined && (
            <span
              className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                armEstopped === true
                  ? "bg-[#4b1b1b] text-[#ff9c94]"
                  : armEstopped === false
                    ? "bg-[#1f3b2a] text-[#9cebb7]"
                    : "bg-[#3a332a] text-[#c9bda6]"
              }`}
            >
              {armEstopped === true ? "arm estop" : armEstopped === false ? "arm ok" : "arm status"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onEnableMicInput && (
            <button
              onClick={onEnableMicInput}
              className="font-mono text-[10px] text-[#8a7d6d] transition hover:text-[#bfb49e]"
            >
              enable mic
            </button>
          )}
          {onClearFaults && (
            <button
              onClick={onClearFaults}
              className="font-mono text-[10px] text-[#8a7d6d] transition hover:text-[#bfb49e]"
            >
              clear faults
            </button>
          )}
          {onTorqueOn && (
            <button
              onClick={onTorqueOn}
              className="font-mono text-[10px] text-[#8a7d6d] transition hover:text-[#bfb49e]"
            >
              torque on
            </button>
          )}
          {onTorqueOff && (
            <button
              onClick={onTorqueOff}
              className="font-mono text-[10px] text-[#8a7d6d] transition hover:text-[#bfb49e]"
            >
              torque off
            </button>
          )}
          <button
            onClick={onClear}
            className="font-mono text-[10px] text-[#8a7d6d] transition hover:text-[#bfb49e]"
          >
            clear
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-6">
        {logs.length === 0 && (
          <div className="text-[#4a4235]">
            Ready. Connect to MARS to start.
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className={`flex gap-2 ${
              log.type === "error"
                ? "text-[#e74c3c]"
                : log.type === "success"
                  ? "text-[#27ae60]"
                  : "text-[#8a7d6d]"
            }`}
          >
            <span className="flex-shrink-0 select-none text-[#4a4235]">
              {log.timestamp.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
