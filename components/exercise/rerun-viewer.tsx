"use client";

import { useEffect, useRef } from "react";

interface RerunViewerProps {
  url: string | null;
  version?: number;
  className?: string;
}

/**
 * Uses the vanilla JS API. The viewer connects to a gRPC stream URL
 * and stays connected — the backend pushes new data on each simulation.
 */
export function SimulationViewer({ url, version = 0, className }: RerunViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);

  // Create viewer with the URL. Re-create when url or version changes.
  useEffect(() => {
    if (!containerRef.current || !url) return;

    let cancelled = false;

    async function init() {
      const { WebViewer } = await import("@rerun-io/web-viewer");
      if (cancelled) return;

      const viewer = new WebViewer();
      viewerRef.current = viewer;

      await viewer.start(url, containerRef.current, {
        width: "100%",
        height: "100%",
        hide_welcome_screen: true,
      });
    }

    init();

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.stop();
      } catch {
        // WASM cleanup can throw — safe to ignore
      }
      viewerRef.current = null;
    };
  }, [url, version]);

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
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
