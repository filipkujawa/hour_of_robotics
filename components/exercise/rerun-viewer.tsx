"use client";

import WebViewer from "@rerun-io/web-viewer-react";
import { useMemo } from "react";

interface RerunViewerProps {
  url: string | null;
  className?: string;
}

/**
 * A modular wrapper for the Rerun Web Viewer.
 * Connects to a Rerun stream URL (usually from the simulation backend).
 */
export function SimulationViewer({ url, className }: RerunViewerProps) {
  // Memoize the viewer to prevent unnecessary re-mounts
  const viewer = useMemo(() => {
    if (!url) return null;
    return (
      <WebViewer
        rrd={url}
        width="100%"
        height="100%"
      />
    );
  }, [url]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed ${className}`}>
        <p className="text-muted-foreground text-sm">
          Run simulation to view 3D preview
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border shadow-sm ${className}`}>
      {viewer}
    </div>
  );
}
