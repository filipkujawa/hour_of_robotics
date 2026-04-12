"""
OWLv2 text-prompted object detection.

Runs on M3 Mac via MPS. More reliable than Grounding DINO for
open-vocabulary detection — fewer hallucinations on furniture/background.
"""

import torch
import numpy as np
from PIL import Image
from transformers import Owlv2Processor, Owlv2ForObjectDetection

# Camera horizontal FOV in degrees
CAMERA_HFOV = 73.0


class VisionDetector:
    def __init__(self, confidence_threshold: float = 0.15):
        self.confidence_threshold = confidence_threshold
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"[vision] Loading OWLv2 on {self.device}...")

        model_id = "google/owlv2-base-patch16-ensemble"
        self.processor = Owlv2Processor.from_pretrained(model_id)
        self.model = Owlv2ForObjectDetection.from_pretrained(model_id).to(self.device)
        self.model.eval()
        print("[vision] Model loaded.")

        self.prompt: str | None = None
        self.queries: list[str] = []
        self.last_result: dict | None = None

    def set_prompt(self, prompt: str):
        """Set the text prompt for detection."""
        raw = prompt.strip().rstrip(".")
        self.prompt = raw

        # OWLv2 takes a list of text queries
        # Include the full prompt + "person" as fallback if it's a person query
        self.queries = [raw]

        self.last_result = None
        print(f"[vision] Prompt set: {self.queries}")

    def detect(self, frame: np.ndarray) -> dict | None:
        """Run detection on a BGR frame."""
        if not self.prompt or not self.queries:
            return None

        h, w = frame.shape[:2]
        image = Image.fromarray(frame[:, :, ::-1])

        inputs = self.processor(text=[self.queries], images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)

        target_sizes = torch.tensor([(h, w)], device=self.device)
        results = self.processor.image_processor.post_process_object_detection(
            outputs, threshold=self.confidence_threshold, target_sizes=target_sizes
        )[0]

        boxes = results["boxes"].cpu().numpy()
        scores = results["scores"].cpu().numpy()
        label_ids = results["labels"].cpu().numpy()

        if len(boxes) > 0:
            print(f"[vision] {len(boxes)} detections for {self.queries}:")
            for i in range(len(boxes)):
                bx = boxes[i]
                query = self.queries[label_ids[i]] if label_ids[i] < len(self.queries) else "?"
                cx_pct = ((bx[0] + bx[2]) / 2.0 / w * 100)
                bw = bx[2] - bx[0]
                bh = bx[3] - bx[1]
                print(f"  [{i}] query='{query}' conf={scores[i]:.3f} "
                      f"box=[{bx[0]:.0f},{bx[1]:.0f},{bx[2]:.0f},{bx[3]:.0f}] "
                      f"size={bw:.0f}x{bh:.0f} center_x={cx_pct:.1f}%")
        else:
            print(f"[vision] No detections for {self.queries} (threshold={self.confidence_threshold})")

        if len(boxes) == 0:
            self.last_result = {
                "detected": False,
                "bbox": None,
                "center_x": 0.5,
                "center_y": 0.5,
                "angle": 0.0,
                "distance_cm": 0.0,
                "confidence": 0.0,
                "label": "",
            }
            return self.last_result

        # Pick highest confidence
        best_idx = int(np.argmax(scores))
        box = boxes[best_idx]
        score = float(scores[best_idx])
        query = self.queries[label_ids[best_idx]] if label_ids[best_idx] < len(self.queries) else self.prompt

        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2.0 / w
        cy = (y1 + y2) / 2.0 / h
        bbox_h = y2 - y1

        angle = (cx - 0.5) * CAMERA_HFOV

        # Distance estimate: calibrated so a person filling ~70% of frame = ~100cm
        # bbox_ratio = how much of frame height the detection fills
        bbox_ratio = bbox_h / h
        if bbox_ratio > 0.01:
            distance_cm = 70.0 / bbox_ratio
        else:
            distance_cm = 500.0
        distance_cm = min(distance_cm, 500.0)

        result_angle = round(float(angle), 1)
        result_dist = round(float(distance_cm), 0)
        print(f"[vision] → Selected [{best_idx}] '{query}' conf={score:.3f} angle={result_angle}° dist={result_dist}cm")

        self.last_result = {
            "detected": True,
            "bbox": [float(x1), float(y1), float(x2), float(y2)],
            "center_x": float(cx),
            "center_y": float(cy),
            "angle": result_angle,
            "distance_cm": result_dist,
            "confidence": round(score, 3),
            "label": query,
        }
        return self.last_result

    def get_last_result(self) -> dict | None:
        return self.last_result
