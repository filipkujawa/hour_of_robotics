"""
Vision server — runs on your Mac, processes the robot's camera stream.

Connects to the robot's rosbridge websocket to get camera frames,
runs Grounding DINO for text-prompted object detection, and exposes
results via a simple HTTP API that the Blockly executor calls.

Usage:
    python -m vision.server
    python -m vision.server --robot-url ws://mars-the-blue.local:9090 --port 8910
"""

import argparse
import threading
import time

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vision.detector import VisionDetector
from vision.camera_bridge import CameraBridge

app = FastAPI(title="MARS Vision Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Globals — initialized in main()
detector: VisionDetector | None = None
camera: CameraBridge | None = None
_detection_thread_running = False


class FindRequest(BaseModel):
    prompt: str  # e.g. "person wearing blue jeans"


class DetectionResult(BaseModel):
    detected: bool = False
    angle: float = 0.0         # degrees offset from center (positive = right)
    distance_cm: float = 0.0   # estimated distance in cm
    confidence: float = 0.0
    label: str = ""
    prompt: str = ""


@app.post("/find")
def find_target(req: FindRequest):
    """Set the detection prompt. The server will start looking for this in the camera stream."""
    if detector is None:
        return {"error": "Detector not initialized"}
    detector.set_prompt(req.prompt)
    return {"ok": True, "prompt": req.prompt}


@app.post("/clear")
def clear_target():
    """Stop looking for anything."""
    if detector:
        detector.prompt = None
        detector.last_result = None
    return {"ok": True}


@app.get("/status", response_model=DetectionResult)
def get_status():
    """Get the latest detection result."""
    if detector is None:
        return DetectionResult()
    result = detector.get_last_result()
    if result is None:
        return DetectionResult(prompt=detector.prompt or "")
    return DetectionResult(
        detected=result["detected"],
        angle=result["angle"],
        distance_cm=result["distance_cm"],
        confidence=result["confidence"],
        label=result["label"],
        prompt=detector.prompt or "",
    )


@app.get("/health")
def health():
    has_frame = camera is not None and camera.latest_frame is not None
    return {
        "ok": True,
        "has_frame": has_frame,
        "prompt": detector.prompt if detector else None,
        "device": detector.device if detector else None,
    }


def _detection_loop():
    """Background loop: grab frames from camera bridge, run detection."""
    global _detection_thread_running
    _detection_thread_running = True
    print("[vision] Detection loop started.")

    while _detection_thread_running:
        if camera is None or detector is None or detector.prompt is None:
            time.sleep(0.1)
            continue

        frame = camera.get_frame()
        if frame is None:
            time.sleep(0.1)
            continue

        try:
            detector.detect(frame)
        except Exception as e:
            print(f"[vision] Detection error: {e}")
            time.sleep(0.5)


def main():
    global detector, camera

    parser = argparse.ArgumentParser(description="MARS Vision Server")
    parser.add_argument("--robot-url", default="ws://mars-the-blue.local:9090",
                        help="Rosbridge websocket URL")
    parser.add_argument("--camera-topic", default="/mars/main_camera/left/image_raw/compressed",
                        help="ROS compressed image topic")
    parser.add_argument("--port", type=int, default=8910,
                        help="HTTP port for the vision API")
    parser.add_argument("--confidence", type=float, default=0.25,
                        help="Detection confidence threshold")
    args = parser.parse_args()

    # Initialize detector (loads model)
    detector = VisionDetector(confidence_threshold=args.confidence)

    # Start camera bridge
    camera = CameraBridge(ws_url=args.robot_url, topic=args.camera_topic)
    camera.start()

    # Start detection loop in background thread
    det_thread = threading.Thread(target=_detection_loop, daemon=True)
    det_thread.start()

    print(f"[vision] API running on http://localhost:{args.port}")
    print(f"[vision] Camera: {args.robot_url} → {args.camera_topic}")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
