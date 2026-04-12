"""
Bridges the robot's ROS camera stream to the vision detector.

Connects to rosbridge via websocket, subscribes to the compressed image topic,
decodes frames, and feeds them to the detector.
"""

import asyncio
import base64
import json
import threading
import time

import cv2
import numpy as np

# Throttle: process at most N frames per second
MAX_FPS = 3


class CameraBridge:
    """Subscribes to a ROS compressed image topic via rosbridge websocket."""

    def __init__(self, ws_url: str, topic: str = "/mars/main_camera/left/image_raw/compressed"):
        self.ws_url = ws_url
        self.topic = topic
        self.latest_frame: np.ndarray | None = None
        self.frame_time: float = 0
        self._running = False
        self._thread: threading.Thread | None = None
        self._min_interval = 1.0 / MAX_FPS

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _run_loop(self):
        asyncio.run(self._async_loop())

    async def _async_loop(self):
        import websockets

        while self._running:
            try:
                print(f"[camera] Connecting to {self.ws_url}...")
                async with websockets.connect(self.ws_url, max_size=10_000_000) as ws:
                    print(f"[camera] Connected. Subscribing to {self.topic}...")

                    # Subscribe to the compressed image topic with throttle
                    subscribe_msg = json.dumps({
                        "op": "subscribe",
                        "topic": self.topic,
                        "type": "sensor_msgs/CompressedImage",
                        "throttle_rate": int(self._min_interval * 1000),
                        "queue_length": 1,
                    })
                    await ws.send(subscribe_msg)

                    while self._running:
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
                        except asyncio.TimeoutError:
                            continue

                        try:
                            msg = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        if msg.get("topic") != self.topic:
                            continue

                        data = msg.get("msg", {}).get("data")
                        if not data:
                            continue

                        # Throttle
                        now = time.time()
                        if now - self.frame_time < self._min_interval:
                            continue
                        self.frame_time = now

                        # Decode image data → BGR numpy array
                        try:
                            if isinstance(data, str):
                                # base64 encoded string
                                jpg_bytes = base64.b64decode(data)
                            elif isinstance(data, list):
                                # raw byte array from rosbridge
                                jpg_bytes = bytes(data)
                            elif isinstance(data, bytes):
                                jpg_bytes = data
                            else:
                                continue

                            arr = np.frombuffer(jpg_bytes, dtype=np.uint8)
                            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                            if frame is not None:
                                self.latest_frame = frame
                        except Exception as e:
                            print(f"[camera] Decode error: {e}")

            except Exception as e:
                print(f"[camera] Connection error: {e}")
                await asyncio.sleep(2.0)

    def get_frame(self) -> np.ndarray | None:
        return self.latest_frame
