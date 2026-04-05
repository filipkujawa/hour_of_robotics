"use client";

import { useState, useCallback, useRef } from "react";
import { RobotConnection, ConnectionStatus } from "./connection";
import { BlockExecutor } from "./executor";

export interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: "info" | "error" | "success";
}

export function useRobot() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const robotRef = useRef<RobotConnection | null>(null);
  const executorRef = useRef<BlockExecutor | null>(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, timestamp: new Date(), message, type },
    ].slice(-100)); // keep last 100 entries
  }, []);

  const connect = useCallback(async (url?: string) => {
    if (robotRef.current) {
      robotRef.current.disconnect();
    }

    const robot = new RobotConnection({
      url: url || "ws://mars.local:9090",
      onStatusChange: setStatus,
      onError: (msg) => addLog(msg, "error"),
      onLog: (msg) => addLog(msg, "info"),
    });

    robotRef.current = robot;
    executorRef.current = new BlockExecutor(robot, (msg) => addLog(msg, "info"));

    try {
      await robot.connect();
      addLog("Connected to Mars!", "success");
    } catch {
      addLog("Failed to connect. Is the robot on and reachable?", "error");
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    robotRef.current?.disconnect();
    robotRef.current = null;
    executorRef.current = null;
  }, []);

  const runWorkspace = useCallback(async (workspace: unknown) => {
    if (!executorRef.current || !robotRef.current) {
      addLog("Not connected to robot", "error");
      return;
    }

    const blocks = BlockExecutor.serializeWorkspace(workspace);
    if (blocks.length === 0) {
      addLog("No blocks to execute", "error");
      return;
    }

    setIsRunning(true);
    try {
      await executorRef.current.execute(blocks);
      addLog("Program completed", "success");
    } catch (err) {
      addLog(`Execution error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
    setIsRunning(false);
  }, [addLog]);

  const stopExecution = useCallback(() => {
    executorRef.current?.stop();
    setIsRunning(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    status,
    isRunning,
    logs,
    connect,
    disconnect,
    runWorkspace,
    stopExecution,
    clearLogs,
  };
}
