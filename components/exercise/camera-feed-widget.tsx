"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, RefreshCw, Settings2 } from "lucide-react";

type CameraFeed = {
  id: string;
  label: string;
  topic: string;
  annotatedTopic: string | null;
  annotationsEnabled: boolean;
  messageType: string | null;
  frame: string | null;
  format: string | null;
  lastUpdated: number | null;
  status: "idle" | "connecting" | "live" | "error";
  error: string | null;
};

const DEFAULT_FEEDS: CameraFeed[] = [
  {
    id: "left",
    label: "Left",
    topic: "/mars/main_camera/left/image_raw/compressed",
    annotatedTopic: "/aruco_left/annotated",
    annotationsEnabled: false,
    messageType: null,
    frame: null,
    format: null,
    lastUpdated: null,
    status: "idle",
    error: null,
  },
  {
    id: "arm",
    label: "Arm",
    topic: "/mars/arm/image_raw/compressed",
    annotatedTopic: "/aruco/annotated",
    annotationsEnabled: false,
    messageType: null,
    frame: null,
    format: null,
    lastUpdated: null,
    status: "idle",
    error: null,
  },
];

function normalizeMimeType(format: string | null) {
  if (!format) return "image/jpeg";

  const lower = format.toLowerCase();
  if (lower.includes("png")) return "image/png";
  if (lower.includes("webp")) return "image/webp";
  return "image/jpeg";
}

function createImageSrc(data: string, format: string | null) {
  return `data:${normalizeMimeType(format)};base64,${data}`;
}

function createImageSrcFromBytes(data: Uint8Array, format: string | null) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return createImageSrc(btoa(binary), format);
}

function isCompressedImageMessage(
  message: unknown,
): message is { data?: string; format?: string } {
  return typeof message === "object" && message !== null;
}

function isRawImageMessage(
  message: unknown,
): message is {
  data?: unknown;
  encoding?: string;
  width?: number;
  height?: number;
  step?: number;
} {
  return typeof message === "object" && message !== null;
}

function normalizeTopicType(topic: string, topicType: string | null) {
  if (topicType && (topicType.includes("CompressedImage") || topicType.includes("Image"))) {
    return topicType;
  }

  return topic.endsWith("/compressed")
    ? "sensor_msgs/CompressedImage"
    : "sensor_msgs/Image";
}

function toUint8Array(data: unknown) {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) return Uint8Array.from(data);
  if (typeof data === "string") {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
      bytes[i] = data.charCodeAt(i);
    }
    return bytes;
  }
  return null;
}

function isCompressedTopicType(messageType: string) {
  return messageType.includes("CompressedImage");
}

function subscribeToFeed(
  roslib: typeof import("roslib"),
  ros: import("roslib").Ros,
  feed: { id: string; topic: string },
  messageType: string,
  setFeeds: React.Dispatch<React.SetStateAction<CameraFeed[]>>,
  subscriptions: Array<{ unsubscribe: () => void }>,
  cancelledRef: { current: boolean },
) {
  setFeeds((current) =>
    current.map((currentFeed) =>
      currentFeed.id === feed.id
        ? {
            ...currentFeed,
            messageType,
            status: "connecting",
            error: null,
          }
        : currentFeed,
    ),
  );

  const topic = new roslib.Topic({
    ros,
    name: feed.topic,
    messageType,
    throttle_rate: 125,
    queue_length: 1,
  });

  topic.subscribe((message: unknown) => {
    if (cancelledRef.current) return;

    if (isCompressedTopicType(messageType)) {
      if (!isCompressedImageMessage(message)) return;
      const format = typeof message.format === "string" ? message.format : null;
      const frame =
        typeof message.data === "string"
          ? createImageSrc(message.data, format)
          : (() => {
              const bytes = toUint8Array(message.data);
              return bytes ? createImageSrcFromBytes(bytes, format) : null;
            })();

      if (!frame) return;

      setFeeds((current) =>
        current.map((currentFeed) =>
          currentFeed.id === feed.id
            ? {
                ...currentFeed,
                frame,
                format,
                lastUpdated: Date.now(),
                status: "live",
                error: null,
              }
            : currentFeed,
        ),
      );
      return;
    }

    if (!isRawImageMessage(message)) return;
    const frame = convertRawImageToDataUrl(message);
    if (!frame) {
      setFeeds((current) =>
        current.map((currentFeed) =>
          currentFeed.id === feed.id
            ? {
                ...currentFeed,
                status: "error",
                error: `Unsupported raw encoding: ${typeof message.encoding === "string" ? message.encoding : "unknown"}`,
              }
            : currentFeed,
        ),
      );
      return;
    }

    setFeeds((current) =>
      current.map((currentFeed) =>
        currentFeed.id === feed.id
          ? {
              ...currentFeed,
              frame,
              format: typeof message.encoding === "string" ? message.encoding : null,
              lastUpdated: Date.now(),
              status: "live",
              error: null,
            }
          : currentFeed,
      ),
    );
  });

  subscriptions.push(topic);
}

function convertRawImageToDataUrl(message: {
  data?: unknown;
  encoding?: string;
  width?: number;
  height?: number;
}) {
  if (typeof document === "undefined") return null;
  if (typeof message.width !== "number" || typeof message.height !== "number") return null;

  const bytes = toUint8Array(message.data);
  if (!bytes) return null;

  const width = message.width;
  const height = message.height;
  const encoding = (message.encoding ?? "rgb8").toLowerCase();
  const rgba = new Uint8ClampedArray(width * height * 4);

  if (encoding === "rgb8") {
    for (let src = 0, dest = 0; src + 2 < bytes.length && dest + 3 < rgba.length; src += 3, dest += 4) {
      rgba[dest] = bytes[src];
      rgba[dest + 1] = bytes[src + 1];
      rgba[dest + 2] = bytes[src + 2];
      rgba[dest + 3] = 255;
    }
  } else if (encoding === "bgr8") {
    for (let src = 0, dest = 0; src + 2 < bytes.length && dest + 3 < rgba.length; src += 3, dest += 4) {
      rgba[dest] = bytes[src + 2];
      rgba[dest + 1] = bytes[src + 1];
      rgba[dest + 2] = bytes[src];
      rgba[dest + 3] = 255;
    }
  } else if (encoding === "rgba8") {
    for (let i = 0; i < Math.min(bytes.length, rgba.length); i += 1) {
      rgba[i] = bytes[i];
    }
  } else if (encoding === "bgra8") {
    for (let src = 0, dest = 0; src + 3 < bytes.length && dest + 3 < rgba.length; src += 4, dest += 4) {
      rgba[dest] = bytes[src + 2];
      rgba[dest + 1] = bytes[src + 1];
      rgba[dest + 2] = bytes[src];
      rgba[dest + 3] = bytes[src + 3];
    }
  } else if (encoding === "mono8" || encoding === "8uc1") {
    for (let src = 0, dest = 0; src < bytes.length && dest + 3 < rgba.length; src += 1, dest += 4) {
      const value = bytes[src];
      rgba[dest] = value;
      rgba[dest + 1] = value;
      rgba[dest + 2] = value;
      rgba[dest + 3] = 255;
    }
  } else {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function getStatusLabel(feed: CameraFeed) {
  if (feed.status === "live") return "Live";
  if (feed.status === "error") return "Error";
  if (feed.status === "idle") return "Idle";
  return "Connecting";
}

function formatAge(timestamp: number | null) {
  if (!timestamp) return "Waiting for frames";

  const delta = Date.now() - timestamp;
  if (delta < 1000) return "Live now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  return `${Math.floor(delta / 60_000)}m ago`;
}

export function CameraFeedWidget({
  wsUrl,
  isRobotConnected,
  active,
  className,
}: {
  wsUrl: string;
  isRobotConnected: boolean;
  active: boolean;
  className?: string;
}) {
  const [feeds, setFeeds] = useState<CameraFeed[]>(DEFAULT_FEEDS);
  const [selectedFeedId, setSelectedFeedId] = useState(DEFAULT_FEEDS[0].id);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const selectedFeed = feeds.find((feed) => feed.id === selectedFeedId) ?? feeds[0];
  const selectedFeedTopic =
    selectedFeed?.annotationsEnabled && selectedFeed.annotatedTopic
      ? selectedFeed.annotatedTopic
      : (selectedFeed?.topic ?? "");

  useEffect(() => {
    if (!active) return;

    setFeeds((current) =>
      current.map((feed) => ({
        ...feed,
        status: isRobotConnected && feed.id === selectedFeedId ? "connecting" : "idle",
        error: isRobotConnected ? null : feed.error,
      })),
    );
  }, [active, isRobotConnected, selectedFeedId, sessionKey]);

  useEffect(() => {
    if (!active || !isRobotConnected) {
      setBridgeStatus("idle");
      setBridgeError(null);
      return;
    }

    let cancelled = false;
    const cancelledRef = { current: false };
    let ros: import("roslib").Ros | null = null;
    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    const connect = async () => {
      setBridgeStatus("connecting");
      setBridgeError(null);

      try {
        const roslib = await import("roslib");
        if (cancelled) return;

        const nextRos = new roslib.Ros({ url: wsUrl });
        ros = nextRos;

        nextRos.on("connection", () => {
          if (cancelled) return;
          setBridgeStatus("connected");
          setBridgeError(null);
          setFeeds((current) =>
            current.map((feed) => ({
              ...feed,
              status: feed.id === selectedFeedId ? "connecting" : "idle",
              error: feed.id === selectedFeedId ? null : feed.error,
            })),
          );

          nextRos.getTopicType(
            selectedFeedTopic,
            (resolvedType: string) => {
              if (cancelled) return;
              const messageType = normalizeTopicType(selectedFeedTopic, resolvedType || null);
              subscribeToFeed(
                roslib,
                nextRos,
                { id: selectedFeedId, topic: selectedFeedTopic },
                messageType,
                setFeeds,
                subscriptions,
                cancelledRef,
              );
            },
            () => {
              if (cancelled) return;
              const fallbackType = normalizeTopicType(selectedFeedTopic, null);
              subscribeToFeed(
                roslib,
                nextRos,
                { id: selectedFeedId, topic: selectedFeedTopic },
                fallbackType,
                setFeeds,
                subscriptions,
                cancelledRef,
              );
            },
          );
        });

        nextRos.on("error", (error: unknown) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : "Camera bridge unavailable";
          setBridgeStatus("error");
          setBridgeError(message);
          setFeeds((current) =>
            current.map((feed) => ({
              ...feed,
              status: feed.id === selectedFeedId ? "error" : "idle",
              error: feed.id === selectedFeedId ? message : feed.error,
            })),
          );
        });

        nextRos.on("close", () => {
          if (cancelled) return;
          setBridgeStatus("idle");
          setFeeds((current) =>
            current.map((feed) => ({
              ...feed,
              status: "idle",
            })),
          );
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load ROS client";
        setBridgeStatus("error");
        setBridgeError(message);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      ros?.close();
    };
  }, [active, isRobotConnected, selectedFeedId, selectedFeedTopic, sessionKey, wsUrl]);

  const updateTopic = (id: string, topic: string) => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id
          ? {
              ...feed,
              topic,
              messageType: null,
              frame: null,
              format: null,
              lastUpdated: null,
              status: isRobotConnected && feed.id === selectedFeedId ? "connecting" : "idle",
              error: null,
            }
          : feed,
      ),
    );
  };

  const reconnect = () => {
    setSessionKey((current) => current + 1);
  };

  const toggleAnnotations = () => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === selectedFeedId && feed.annotatedTopic
          ? {
              ...feed,
              annotationsEnabled: !feed.annotationsEnabled,
              messageType: null,
              frame: null,
              format: null,
              lastUpdated: null,
              status: isRobotConnected ? "connecting" : "idle",
              error: null,
            }
          : feed,
      ),
    );
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-xl border border-[#e7e4de] bg-[#f7f5ef] ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#e7e4de] bg-[linear-gradient(135deg,#faf8f2_0%,#f2eee4_100%)] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b7355]">
            <Camera className="h-3.5 w-3.5 text-[#d97706]" />
            Robot Cameras
          </div>
          <p className="mt-1 text-[12px] text-[#6b6257]">
            {isRobotConnected
              ? bridgeStatus === "connected"
                ? `Streaming the selected ${selectedFeed.label.toLowerCase()} camera from MARS.`
                : bridgeStatus === "connecting"
                  ? `Connecting to the ROS bridge for the ${selectedFeed.label.toLowerCase()} camera.`
                  : bridgeError ?? "Waiting for camera bridge."
              : "Connect to MARS to watch the selected live robot feed."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="min-w-[140px]">
            <span className="sr-only">Camera selector</span>
            <select
              value={selectedFeedId}
              onChange={(event) => setSelectedFeedId(event.target.value)}
              className="h-8 w-full rounded-full border border-[#e2dbcf] bg-white px-3 text-sm text-[#31281f] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/10"
            >
              {feeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={toggleAnnotations}
            disabled={!selectedFeed.annotatedTopic}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors ${
              selectedFeed.annotatedTopic
                ? selectedFeed.annotationsEnabled
                  ? "border-[#d97706] bg-[#fff7ed] text-[#9a3412] hover:bg-[#ffedd5]"
                  : "border-[#e2dbcf] bg-white text-[#5e5142] hover:bg-[#fbfaf7]"
                : "cursor-not-allowed border-[#ece7de] bg-[#f7f3ec] text-[#b8aa96]"
            }`}
          >
            ArUco
            <span className="text-[10px] uppercase tracking-[0.08em]">
              {selectedFeed.annotatedTopic ? (selectedFeed.annotationsEnabled ? "On" : "Off") : "N/A"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((current) => !current)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-[#e2dbcf] bg-white px-3 text-[11px] font-medium text-[#5e5142] transition-colors hover:bg-[#fbfaf7]"
          >
            <Settings2 className="h-3 w-3" />
            Topics
          </button>
          <button
            type="button"
            onClick={reconnect}
            className="flex h-8 items-center gap-1.5 rounded-full border border-[#e2dbcf] bg-white px-3 text-[11px] font-medium text-[#5e5142] transition-colors hover:bg-[#fbfaf7]"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="grid gap-3 border-b border-[#e7e4de] bg-white px-4 py-3 md:grid-cols-3">
          {feeds.map((feed) => (
            <label key={feed.id} className="block">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9f8b74]">
                {feed.label} topic
              </div>
              <input
                value={feed.topic}
                onChange={(event) => updateTopic(feed.id, event.target.value)}
                className="w-full rounded-lg border border-[#e2dbcf] bg-[#fbfaf7] px-3 py-2 font-mono text-[11px] text-[#31281f] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/10"
              />
              {feed.annotatedTopic ? (
                <>
                  <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9f8b74]">
                    {feed.label} annotated topic
                  </div>
                  <input
                    value={feed.annotatedTopic}
                    readOnly
                    className="w-full rounded-lg border border-[#ece7de] bg-[#f4efe7] px-3 py-2 font-mono text-[11px] text-[#7b6c59] outline-none"
                  />
                </>
              ) : null}
            </label>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#e3ddd2] bg-[#171615] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {selectedFeed.frame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedFeed.frame}
              alt={`${selectedFeed.label} robot camera`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#c8b9a2]">
              {isRobotConnected ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#d97706]" />
              ) : (
                <Camera className="h-6 w-6 text-[#8f7b67]" />
              )}
              <div>
                <p className="text-sm font-medium text-[#f6efe4]">{selectedFeed.label} camera</p>
                <p className="mt-1 max-w-sm text-xs text-[#b7a890]">
                  {selectedFeed.error ?? (isRobotConnected ? "Waiting for the first compressed frame." : "Connect to the robot to start the camera stream.")}
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            {selectedFeed.label}
          </div>
          <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
            {formatAge(selectedFeed.lastUpdated)}
          </div>
          <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
            {getStatusLabel(selectedFeed)}
          </div>
        </div>
      </div>
    </div>
  );
}
