from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
import uuid
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from simulation.core.mars_sim import MarsSimulator

app = FastAPI(title="Mars Robot Simulation Service")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, MarsSimulator] = {}

class BlockData(BaseModel):
    type: str
    fields: Dict[str, Any]
    inputs: Dict[str, Optional[Any]]
    next: Optional["BlockData"] = None

# Allow recursive model
BlockData.model_rebuild()

class SimulationRequest(BaseModel):
    session_id: Optional[str] = None
    blocks: List[BlockData]

class SimulationResponse(BaseModel):
    session_id: str
    rerun_url: str

def process_block_chain(sim: MarsSimulator, block: Optional[BlockData], sim_time: float) -> float:
    """Recursively processes a chain of blocks."""
    if not block:
        return sim_time
        
    if block.type == "mars_move_forward":
        steps = float(block.fields.get("STEPS", 1))
        duration = 1.0
        sim.move_forward(steps, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_move_backward":
        steps = float(block.fields.get("STEPS", 1))
        duration = 1.0
        sim.move_forward(-steps, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_turn":
        direction = block.fields.get("DIRECTION", "LEFT")
        degrees = float(block.fields.get("DEGREES", 90))
        duration = 0.5
        sim.turn(direction, degrees, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_turn_left":
        degrees = float(block.fields.get("ANGLE", 90))
        duration = 0.5
        sim.turn("LEFT", degrees, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_turn_right":
        degrees = float(block.fields.get("ANGLE", 90))
        duration = 0.5
        sim.turn("RIGHT", degrees, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_say":
        text = str(block.fields.get("TEXT", "Hello!"))
        sim_time += 0.5
        sim.say(text, sim_time)
    elif block.type == "mars_arm_home":
        duration = 1.0
        sim.animate_joints({
            "joint1": 0.0, "joint2": 0.0, "joint3": 0.0,
            "joint4": 0.0, "joint5": 0.0, "joint6": 0.0, "joint_head": 0.0
        }, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_arm_move_to":
        # Real IK using ikpy with the actual URDF kinematic chain
        x = float(block.fields.get("X", 0)) / 100.0  # cm to m
        y = float(block.fields.get("Y", 0)) / 100.0
        z = float(block.fields.get("Z", 20)) / 100.0
        duration = 1.0
        joints = sim.solve_ik(x, y, z)
        sim.animate_joints(joints, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_gripper":
        action = block.fields.get("ACTION", "OPEN")
        duration = 0.5
        val = 0.3 if action == "OPEN" else -0.5
        sim.animate_joints({"joint6": val}, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_wave":
        # Wave animation
        duration = 0.5
        # Lift arm
        sim.animate_joints({"joint2": -0.8, "joint3": 1.2, "joint4": 0.5}, sim_time, duration)
        sim_time += duration
        # Wave back and forth
        for _ in range(2):
            sim.animate_joints({"joint5": 0.5}, sim_time, 0.25)
            sim_time += 0.25
            sim.animate_joints({"joint5": -0.5}, sim_time, 0.25)
            sim_time += 0.25
        # Back to home-ish
        sim.animate_joints({"joint2": 0.0, "joint3": 0.0, "joint4": 0.0, "joint5": 0.0}, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_head_tilt":
        degrees = float(block.fields.get("DEGREES", 0))
        duration = 0.5
        sim.animate_joints({"joint_head": degrees * 3.14159 / 180.0}, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_head_emotion":
        # Map emotions to head tilt angles
        emotion_map = {
            "happy": 10, "sad": -20, "excited": 15,
            "thinking": -10, "neutral": 0,
        }
        emotion = block.fields.get("EMOTION", "neutral")
        angle = emotion_map.get(emotion, 0)
        duration = 0.5
        sim.animate_joints({"joint_head": angle * 3.14159 / 180.0}, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_joint_position":
        joint_num = int(block.fields.get("JOINT", 1))
        angle_deg = float(block.fields.get("ANGLE", 0))
        radians = angle_deg * 3.14159 / 180.0
        joint_name = f"joint{joint_num}"
        duration = 0.8
        sim.animate_joints({joint_name: radians}, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_all_joints":
        duration = 1.0
        joints = {}
        for i in range(1, 7):
            deg = float(block.fields.get(f"J{i}", 0))
            joints[f"joint{i}"] = deg * 3.14159 / 180.0
        sim.animate_joints(joints, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_say_advanced":
        text = str(block.fields.get("TEXT", "Hello!"))
        sim_time += 0.5
        sim.say(text, sim_time)
    elif block.type == "mars_spin":
        degrees = float(block.fields.get("DEGREES", 180))
        duration = abs(degrees) / 180.0
        direction = "LEFT" if degrees >= 0 else "RIGHT"
        sim.turn(direction, abs(degrees), sim_time, duration)
        sim_time += duration
    elif block.type == "mars_navigate_to":
        # Simplified: just move to the target position
        import math as _math
        target_x = float(block.fields.get("X", 0))
        target_y = float(block.fields.get("Y", 0))
        dx = target_x - sim.pos_x
        dy = target_y - sim.pos_y
        dist = _math.sqrt(dx*dx + dy*dy)
        if dist > 0.01:
            # Turn to face target
            target_heading = _math.atan2(dy, dx)
            turn_deg = _math.degrees(target_heading - sim.heading)
            if abs(turn_deg) > 1:
                direction = "LEFT" if turn_deg > 0 else "RIGHT"
                sim.turn(direction, abs(turn_deg), sim_time, 0.5)
                sim_time += 0.5
            # Move forward
            steps = dist / 0.25
            sim.move_forward(steps, sim_time, max(1.0, dist * 2))
            sim_time += max(1.0, dist * 2)
    elif block.type == "mars_wait":
        seconds = float(block.fields.get("SECONDS", 1.0))
        sim_time += seconds

    # ---- Loops ----
    elif block.type == "controls_repeat_ext":
        times_block = block.inputs.get("TIMES")
        times = int(float(times_block.get("fields", {}).get("NUM", 1))) if times_block else 1
        body_raw = block.inputs.get("DO")
        if body_raw:
            body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
            for _ in range(min(times, 50)):
                sim_time = process_block_chain(sim, body, sim_time)

    elif block.type == "mars_repeat":
        count = int(float(block.fields.get("COUNT", 2)))
        body_raw = block.inputs.get("DO")
        if body_raw:
            body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
            for _ in range(min(count, 50)):
                sim_time = process_block_chain(sim, body, sim_time)

    # Process the next block in the chain
    return process_block_chain(sim, block.next, sim_time)

@app.post("/simulate", response_model=SimulationResponse)
async def start_simulation(request: SimulationRequest):
    sid = request.session_id or str(uuid.uuid4())

    # Always create a fresh simulator so old recording data doesn't persist
    if sid in sessions:
        try:
            sessions[sid].rec.disconnect()
        except Exception:
            pass

    sim = MarsSimulator(sid)
    sim.setup_robot_model()
    sessions[sid] = sim

    sim_time = 0.0
    for block in request.blocks:
        sim_time = process_block_chain(sim, block, sim_time)

    # Add a 2-second buffer at the end of the simulation timeline
    # This prevents the Rerun viewer from immediately looping back to the start.
    sim.rec.set_time("sim_time", duration=sim_time + 2.0)
    sim.log_current_state()

    sim.rec.flush()
    return SimulationResponse(session_id=sid, rerun_url=sim.get_viewer_url())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
