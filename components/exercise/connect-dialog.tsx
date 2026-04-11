"use client";

import { useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/lib/robot";
import { DEFAULT_ROBOT_URL } from "@/lib/robot/constants";

export function ConnectDialog({
  isOpen,
  status,
  onConnect,
  onDisconnect,
  onClose,
}: {
  isOpen: boolean;
  status: ConnectionStatus;
  onConnect: (url: string) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(DEFAULT_ROBOT_URL);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[400px] overflow-hidden rounded-2xl border border-[#ddd6cb] bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            {status === "connected" ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-[#b45309]" />
            )}
            <h3 className="font-display text-lg font-semibold text-[#23180d]">
              Connect to MARS
            </h3>
          </div>
          <p className="mt-2 text-sm text-[#746657]">
            Enter the WebSocket URL of your robot&apos;s ROS bridge. Make sure
            you&apos;re on the same WiFi network as MARS.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8f7b67]">
              Robot URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_ROBOT_URL}
              className="w-full rounded-xl border border-[#e1d9cc] bg-[#fbfaf7] px-3 py-2 font-mono text-sm text-[#23180d] placeholder-[#c4b9a8] transition focus:border-[#d97706] focus:outline-none focus:ring-2 focus:ring-[#d97706]/10"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#f8f5ef] p-3">
            <div
              className={`h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "connecting"
                    ? "animate-pulse bg-amber-500"
                    : status === "error"
                      ? "bg-red-500"
                      : "bg-[#c4b9a8]"
              }`}
            />
            <span className="text-xs text-[#746657]">
              {status === "connected"
                ? "Connected to MARS"
                : status === "connecting"
                  ? "Connecting..."
                  : status === "error"
                    ? "Connection failed — check URL & network"
                    : "Not connected"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#eee7dd] bg-[#fbfaf7] px-6 py-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          {status === "connected" ? (
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              className="flex-1 gap-2"
              onClick={() => onConnect(url)}
              disabled={status === "connecting"}
            >
              {status === "connecting" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {status === "connecting" ? "Connecting..." : "Connect"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
