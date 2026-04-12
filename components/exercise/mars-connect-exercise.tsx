"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, Loader2, MessageCircle, Terminal, Wifi, WifiOff } from "lucide-react";

import type { MarsConnectExercise } from "@/lib/course-data";
import { DEFAULT_ROBOT_URL } from "@/lib/robot/constants";
import { useRobot } from "@/lib/robot";
import { MarsChat } from "./mars-chat";
import { ConnectDialog } from "./connect-dialog";
import { RobotConsole } from "./robot-console";

type LeftPanel = "exercise" | "chat";

export function MarsConnectExerciseView({
  exercise,
  onBack,
  onComplete,
}: {
  exercise: MarsConnectExercise;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("exercise");
  const [showConsole, setShowConsole] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [hasTriggeredAction, setHasTriggeredAction] = useState(false);

  const {
    status,
    isRunning,
    logs,
    armEstopped,
    connect,
    disconnect,
    clearLogs,
    sayAndSpin,
    clearArmFaults,
    armTorqueOn,
    armTorqueOff,
    enableMicInput,
  } = useRobot();

  useEffect(() => {
    if (status === "connected") {
      setHasConnected(true);
    }
  }, [status]);

  const handleAction = async () => {
    const success = await sayAndSpin();
    if (success) {
      setHasTriggeredAction(true);
    }
  };

  const tasks = [
    { label: "Connect successfully to MARS.", done: hasConnected },
    { label: "Click the action button so the robot says hi and spins around.", done: hasTriggeredAction },
  ];

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#f5f5f4] text-[#1a1a19]">
      <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[#e2e1de] bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] text-[#9c9c9a] transition-colors hover:text-[#6b6b69]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to lesson
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <span className="max-w-[220px] truncate text-[12px] font-semibold text-[#1a1a19]">{exercise.title}</span>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <nav className="flex items-center gap-0.5 rounded-md bg-[#f0efed] p-0.5">
            <button onClick={() => setLeftPanel("exercise")} className={`rounded px-3 py-1 text-[11px] font-medium transition-all ${leftPanel === "exercise" ? "bg-white text-[#1a1a19] shadow-sm" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
              Exercise
            </button>
            <button onClick={() => setLeftPanel("chat")} className={`flex items-center gap-1.5 rounded px-3 py-1 text-[11px] font-medium transition-all ${leftPanel === "chat" ? "bg-white text-[#1a1a19] shadow-sm" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
              <MessageCircle className="h-3 w-3" />
              Ask Mars
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => setConnectOpen(true)} className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-[#fafaf9]">
            <div className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-green-600" : status === "connecting" ? "animate-pulse bg-amber-500" : status === "error" ? "bg-red-500" : "bg-[#d4d3d0]"}`} />
            {status === "connected" ? <Wifi className="h-3 w-3 text-[#9c9c9a]" /> : <WifiOff className="h-3 w-3 text-[#9c9c9a]" />}
            <span className="text-[11px] text-[#9c9c9a]">
              {status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : status === "error" ? "Connection failed" : "Offline"}
            </span>
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <button onClick={() => setShowConsole((current) => !current)} className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-all ${showConsole ? "bg-[#f0efed] text-[#1a1a19]" : "text-[#9c9c9a] hover:text-[#6b6b69]"}`}>
            <Terminal className="h-3 w-3" />
            {logs.length > 0 ? `${logs.length}` : ""}
          </button>
          <div className="h-4 w-px bg-[#e2e1de]" />
          <button
            onClick={onComplete}
            disabled={!hasConnected || !hasTriggeredAction}
            className="rounded-md bg-[#1a1a19] px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[320px] flex-shrink-0 flex-col overflow-hidden border-r border-[#e2e1de] bg-white">
          {leftPanel === "exercise" ? (
            <>
              <div className="border-b border-[#f0efed] px-4 pt-4 pb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d97706]">Exercise</div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6b6b69]">{exercise.prompt}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9c9c9a]">
                  <CheckCircle2 className="h-3 w-3" />
                  Tasks
                </div>
                <ul className="space-y-1.5">
                  {tasks.map((task) => (
                    <li key={task.label} className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${task.done ? "border-green-200 bg-green-50 text-green-800" : "border-[#f0efed] bg-[#fafaf9] text-[#6b6b69]"}`}>
                      {task.label}
                    </li>
                  ))}
                </ul>
                {hasTriggeredAction && (
                  <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] leading-relaxed text-green-800">
                    {exercise.celebrationMessage}
                  </div>
                )}
              </div>
              <div className="border-t border-[#e2e1de] px-4 py-3">
                <button
                  onClick={handleAction}
                  disabled={status !== "connected" || isRunning}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1a1a19] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isRunning ? "Running..." : exercise.actionLabel}
                </button>
              </div>
            </>
          ) : (
            <MarsChat exercisePrompt={exercise.prompt} />
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-[#fafaf9]">
          <div className="border-b border-[#e2e1de] px-6 py-6">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d97706]">Live Robot Check</div>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-[#1a1a19]">Connect first, then run the hello-and-spin check.</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-[#6b6b69]">
                Use the connection button in the top bar to reach the robot. Once the status shows connected, run the action button below to confirm MARS can receive commands from this browser.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid max-w-4xl gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e1de] bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c9c9a]">Connection</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${status === "connected" ? "bg-green-500" : status === "connecting" ? "animate-pulse bg-amber-500" : status === "error" ? "bg-red-500" : "bg-[#d4d3d0]"}`} />
                  <div className="text-[14px] font-medium text-[#1a1a19]">
                    {status === "connected" ? "MARS is connected." : status === "connecting" ? "Connecting to MARS..." : status === "error" ? "Connection failed." : "MARS is not connected."}
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[#6b6b69]">
                  Default URL: <span className="font-mono text-[#1a1a19]">{DEFAULT_ROBOT_URL}</span>
                </p>
                <button onClick={() => setConnectOpen(true)} className="mt-4 rounded-md border border-[#e2e1de] px-3 py-2 text-[12px] font-medium text-[#6b6b69] transition-colors hover:bg-[#fafaf9]">
                  Open connection dialog
                </button>
              </div>

              <div className="rounded-2xl border border-[#e2e1de] bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c9c9a]">Action Test</div>
                <p className="mt-3 text-[12px] leading-relaxed text-[#6b6b69]">
                  This sends a short check sequence: MARS says hi, then spins in place. Make sure the robot has clearance before running it.
                </p>
                <button
                  onClick={handleAction}
                  disabled={status !== "connected" || isRunning}
                  className="mt-4 rounded-md bg-[#1a1a19] px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {exercise.actionLabel}
                </button>
              </div>
            </div>

            {showConsole && (
              <div className="mt-6 max-w-4xl overflow-hidden rounded-2xl border border-[#e2e1de] bg-white">
                <RobotConsole
                  logs={logs}
                  armEstopped={armEstopped}
                  onClear={clearLogs}
                  onClearFaults={clearArmFaults}
                  onTorqueOn={armTorqueOn}
                  onTorqueOff={armTorqueOff}
                  onEnableMicInput={enableMicInput}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConnectDialog isOpen={connectOpen} status={status} onConnect={connect} onDisconnect={disconnect} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
