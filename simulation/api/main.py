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

# Simple variable store for simulation
sim_variables: Dict[str, Any] = {}

def eval_value_block(sim: MarsSimulator, block) -> Any:
    """Evaluate a value block and return its result."""
    if block is None:
        return 0

    if isinstance(block, dict):
        block = BlockData(**block)

    btype = block.type

    # Number literal
    if btype == "math_number":
        return float(block.fields.get("NUM", 0))

    # Boolean literal
    if btype == "logic_boolean":
        return block.fields.get("BOOL") == "TRUE"

    # Variable get
    if btype == "variables_get":
        var_name = str(block.fields.get("VAR", ""))
        return sim_variables.get(var_name, 0)

    # Tag detection — computed from sim state
    if btype == "mars_tag_detect_arm":
        axis = str(block.fields.get("AXIS", "X"))
        tag = sim.get_tag_in_camera_frame("ARM")
        return tag.get(axis.lower(), 0)

    if btype == "mars_tag_detect_head":
        axis = str(block.fields.get("AXIS", "X"))
        tag = sim.get_tag_in_camera_frame("HEAD")
        return tag.get(axis.lower(), 0)

    if btype == "mars_is_tag_detected":
        return sim.is_tag_visible("ARM") or sim.is_tag_visible("HEAD")

    # Distance sensor (sim: distance from robot to cube)
    if btype == "mars_get_distance":
        import math as _m
        dx = sim.CUBE_POSITION[0] - sim.pos_x
        dy = sim.CUBE_POSITION[1] - sim.pos_y
        return round(_m.sqrt(dx*dx + dy*dy) * 100)  # cm

    # Math operations
    if btype == "math_arithmetic":
        a = float(eval_value_block(sim, block.inputs.get("A")) or 0)
        b = float(eval_value_block(sim, block.inputs.get("B")) or 0)
        op = block.fields.get("OP", "ADD")
        if op == "ADD": return a + b
        if op == "MINUS": return a - b
        if op == "MULTIPLY": return a * b
        if op == "DIVIDE": return a / b if b != 0 else 0
        if op == "POWER": return a ** b
        return 0

    # Comparisons
    if btype == "logic_compare":
        a = float(eval_value_block(sim, block.inputs.get("A")) or 0)
        b = float(eval_value_block(sim, block.inputs.get("B")) or 0)
        op = block.fields.get("OP", "EQ")
        if op == "EQ": return a == b
        if op == "NEQ": return a != b
        if op == "LT": return a < b
        if op == "LTE": return a <= b
        if op == "GT": return a > b
        if op == "GTE": return a >= b
        return False

    if btype == "logic_negate":
        return not eval_value_block(sim, block.inputs.get("BOOL"))

    if btype == "mars_abs":
        return abs(float(eval_value_block(sim, block.inputs.get("VALUE")) or 0))

    # Fallback: try to get a NUM field
    if "NUM" in block.fields:
        return float(block.fields["NUM"])

    return 0


def eval_input_number(block: BlockData, name: str, default: float = 0) -> float:
    """Extract a number from either a field or a nested input block (for _v variants)."""
    if name in block.fields:
        return float(block.fields[name])
    input_block = block.inputs.get(name)
    if input_block:
        if isinstance(input_block, dict):
            return float(input_block.get("fields", {}).get("NUM", default))
        if isinstance(input_block, BlockData):
            return float(input_block.fields.get("NUM", default))
    return default


def eval_input_value(sim: MarsSimulator, block: BlockData, name: str, default: float = 0) -> float:
    """Extract a value from a field OR evaluate a nested value block."""
    if name in block.fields:
        return float(block.fields[name])
    input_block = block.inputs.get(name)
    if input_block:
        return float(eval_value_block(sim, input_block) or default)
    return default


def process_block_chain(sim: MarsSimulator, block: Optional[BlockData], sim_time: float) -> float:
    """Recursively processes a chain of blocks."""
    if not block:
        return sim_time
        
    if block.type in ("mars_move_forward", "mars_move_forward_v"):
        steps = eval_input_value(sim, block, "STEPS", 1)
        duration = 1.0
        sim.move_forward(steps, sim_time, duration)
        sim_time += duration
    elif block.type in ("mars_move_backward", "mars_move_backward_v"):
        steps = eval_input_value(sim, block, "STEPS", 1)
        duration = 1.0
        sim.move_forward(-steps, sim_time, duration)
        sim_time += duration
    elif block.type in ("mars_turn", "mars_turn_v"):
        direction = block.fields.get("DIRECTION", "LEFT")
        degrees = eval_input_value(sim, block, "DEGREES", 90)
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
        duration = 2.0
        sim.animate_joints({
            "joint1": 1.5876701154616386,
            "joint2": -1.5968740001889525,
            "joint3": 1.6152817696435802,
            "joint4": 0.8927768185494431,
            "joint5": -0.035281558121369745,
            "joint6": 0.010737865515199488,
        }, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_arm_move_to":
        # Fixed block: inputs are in cm
        x = eval_input_value(sim, block, "X", 0) / 100.0
        y = eval_input_value(sim, block, "Y", 0) / 100.0
        z = eval_input_value(sim, block, "Z", 20) / 100.0
        duration = 1.0
        joints = sim.solve_ik(x, y, z)
        sim.animate_joints(joints, sim_time, duration)
        sim_time += duration
    elif block.type == "mars_arm_move_to_v":
        # Variable block: inputs are in meters (e.g. from tag detection)
        x = eval_input_value(sim, block, "X", 0)
        y = eval_input_value(sim, block, "Y", 0)
        z = eval_input_value(sim, block, "Z", 0.1)
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
    elif block.type in ("mars_head_tilt", "mars_head_tilt_v"):
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

    # ---- Variables ----
    elif block.type == "variables_set":
        var_name = str(block.fields.get("VAR", ""))
        val = eval_value_block(sim, block.inputs.get("VALUE"))
        sim_variables[var_name] = val

    # ---- Sensor store blocks ----
    elif block.type == "mars_read_distance":
        var_name = str(block.fields.get("VAR", "distance"))
        import math as _m
        dx = sim.CUBE_POSITION[0] - sim.pos_x
        dy = sim.CUBE_POSITION[1] - sim.pos_y
        sim_variables[var_name] = round(_m.sqrt(dx*dx + dy*dy) * 100)

    elif block.type == "mars_read_tag":
        var_name = str(block.fields.get("VAR", "tag_pos"))
        camera = str(block.fields.get("CAMERA", "ARM"))
        axis = str(block.fields.get("AXIS", "X")).lower()
        tag = sim.get_tag_in_camera_frame(camera)
        sim_variables[var_name] = tag.get(axis, 0)

    # ---- Print ----
    elif block.type == "mars_print":
        val = eval_value_block(sim, block.inputs.get("VALUE"))
        sim.say(f"print: {val}", sim_time)
        sim_time += 0.1

    # ---- Event blocks (in sim: just evaluate and run once) ----
    elif block.type == "mars_when_tag":
        # In sim, if tag is visible, run the body
        if sim.is_tag_visible("ARM") or sim.is_tag_visible("HEAD"):
            body_raw = block.inputs.get("DO")
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
                sim_time = process_block_chain(sim, body, sim_time)

    elif block.type == "mars_when_distance":
        threshold = float(block.fields.get("THRESHOLD", 30))
        import math as _m
        dx = sim.CUBE_POSITION[0] - sim.pos_x
        dy = sim.CUBE_POSITION[1] - sim.pos_y
        dist_cm = _m.sqrt(dx*dx + dy*dy) * 100
        if dist_cm < threshold:
            body_raw = block.inputs.get("DO")
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
                sim_time = process_block_chain(sim, body, sim_time)

    elif block.type == "mars_when_condition":
        cond = eval_value_block(sim, block.inputs.get("CONDITION"))
        if cond:
            body_raw = block.inputs.get("DO")
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
                sim_time = process_block_chain(sim, body, sim_time)

    elif block.type == "mars_forever":
        body_raw = block.inputs.get("DO")
        if body_raw:
            body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
            for _ in range(min(100, 100)):  # cap at 100 iterations in sim
                sim_time = process_block_chain(sim, body, sim_time)

    # ---- Drive meters ----
    elif block.type in ("mars_drive_meters", "mars_drive_meters_v"):
        direction = block.fields.get("DIRECTION", "FORWARD")
        meters = eval_input_value(sim, block, "METERS", 0.5)
        steps = meters / 0.25
        if direction == "BACKWARD":
            steps = -steps
        duration = max(0.5, abs(meters) * 2)
        sim.move_forward(steps, sim_time, duration)
        sim_time += duration

    # ---- Navigation ----
    elif block.type == "mars_save_position":
        sim_time += 0.1  # no-op in sim

    elif block.type == "mars_go_to_position":
        sim_time += 0.5  # no-op in sim

    elif block.type == "mars_drive_to":
        sim_time += 1.0  # no-op in sim

    # ---- While loop with condition evaluation ----
    elif block.type == "controls_whileUntil":
        mode = block.fields.get("MODE", "WHILE")
        body_raw = block.inputs.get("DO")
        for _ in range(min(100, 100)):
            cond = eval_value_block(sim, block.inputs.get("BOOL"))
            should_continue = bool(cond) if mode == "WHILE" else not bool(cond)
            if not should_continue:
                break
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
                sim_time = process_block_chain(sim, body, sim_time)

    # ---- If/else ----
    elif block.type == "controls_if":
        cond = eval_value_block(sim, block.inputs.get("IF0"))
        if cond:
            body_raw = block.inputs.get("DO0")
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
                sim_time = process_block_chain(sim, body, sim_time)
        else:
            body_raw = block.inputs.get("ELSE")
            if body_raw:
                body = BlockData(**body_raw) if isinstance(body_raw, dict) else body_raw
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

    sim_variables.clear()
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
