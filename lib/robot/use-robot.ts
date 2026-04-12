"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { RobotConnection, ConnectionStatus } from "./connection";
import { BlockExecutor } from "./executor";
import { DEFAULT_ROBOT_URL } from "./constants";

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
  const [armEstopped, setArmEstopped] = useState<boolean | null>(null);
  const [connectionUrl, setConnectionUrl] = useState(DEFAULT_ROBOT_URL);
  const [batteryPct, setBatteryPct] = useState<number | null>(null);

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
    const resolvedUrl = url || DEFAULT_ROBOT_URL;
    if (robotRef.current) {
      robotRef.current.disconnect();
    }

    const robot = new RobotConnection({
      url: resolvedUrl,
      onStatusChange: setStatus,
      onError: (msg) => addLog(msg, "error"),
      onLog: (msg) => addLog(msg, "info"),
      onArmEstopChange: setArmEstopped,
    });

    setConnectionUrl(resolvedUrl);
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

  const fetchSkills = useCallback(async (): Promise<string[]> => {
    if (!robotRef.current) return [];
    return robotRef.current.getAvailableSkills();
  }, []);

  const sayAndSpin = useCallback(async () => {
    if (!robotRef.current) {
      addLog("Not connected to robot", "error");
      return false;
    }

    setIsRunning(true);
    try {
      await robotRef.current.say("Hi!");
      await robotRef.current.turn("LEFT", 360);
      addLog("Hello-and-spin check completed", "success");
      return true;
    } catch (err) {
      addLog(`Action error: ${err instanceof Error ? err.message : String(err)}`, "error");
      return false;
    } finally {
      setIsRunning(false);
    }
  }, [addLog]);

  const clearArmFaults = useCallback(async () => {
    if (!robotRef.current) {
      addLog("Not connected to robot", "error");
      return;
    }

    try {
      await robotRef.current.armReboot();
      addLog("Clear faults requested (arm reboot)", "success");
    } catch (err) {
      addLog(`Clear faults error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [addLog]);

  const armTorqueOn = useCallback(async () => {
    if (!robotRef.current) {
      addLog("Not connected to robot", "error");
      return;
    }

    try {
      await robotRef.current.armTorqueOn();
      addLog("Arm torque ON", "success");
    } catch (err) {
      addLog(`Torque on error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [addLog]);

  const armTorqueOff = useCallback(async () => {
    if (!robotRef.current) {
      addLog("Not connected to robot", "error");
      return;
    }

    try {
      await robotRef.current.armTorqueOff();
      addLog("Arm torque OFF", "success");
    } catch (err) {
      addLog(`Torque off error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [addLog]);

  const emergencyStop = useCallback(async () => {
    executorRef.current?.stop();
    setIsRunning(false);

    if (!robotRef.current) {
      addLog("Not connected to robot", "error");
      return;
    }

    try {
      robotRef.current.stop();
      await robotRef.current.armTorqueOff();
      addLog("E-STOP: velocity zeroed, arm torque off", "error");
    } catch (err) {
      addLog(`E-STOP error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [addLog]);

  // Poll battery every 30 seconds when connected
  useEffect(() => {
    if (status !== "connected") { setBatteryPct(null); return; }
    let cancelled = false;
    const poll = async () => {
      const robot = robotRef.current;
      if (!robot || cancelled) return;
      const pct = await robot.getBattery();
      if (!cancelled && pct >= 0) setBatteryPct(pct);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [status]);

  return {
    status,
    isRunning,
    logs,
    armEstopped,
    batteryPct,
    connectionUrl,
    connect,
    disconnect,
    runWorkspace,
    stopExecution,
    clearLogs,
    sayAndSpin,
    fetchSkills,
    clearArmFaults,
    armTorqueOn,
    armTorqueOff,
    emergencyStop,
  };
}
