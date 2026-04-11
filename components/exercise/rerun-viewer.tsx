"use client";

import { useEffect, useRef } from "react";

interface RerunViewerProps {
  url: string | null;
  version?: number;
  className?: string;
}

/**
 * Uses the vanilla JS API. Key={url+version} on the wrapper forces
 * a full React unmount/remount to get a clean WASM state each time.
 */
function RerunViewerInner({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      // Don't call viewer.stop() — let the WASM instance die with the DOM node.
      // Calling stop() during React unmount causes the WASM null pointer crash.
      viewerRef.current = null;
    };
  }, [url]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

export function SimulationViewer({ url, version = 0, className }: RerunViewerProps) {
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
      <RerunViewerInner key={`${url}-${version}`} url={url} />
    </div>
  );
}
