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
    elif block.type == "mars_wait":
        seconds = float(block.fields.get("SECONDS", 1.0))
        sim_time += seconds
        # No action needed, just advance time
        
    # Process the next block in the chain
    return process_block_chain(sim, block.next, sim_time)

@app.post("/simulate", response_model=SimulationResponse)
async def start_simulation(request: SimulationRequest):
    sid = request.session_id or str(uuid.uuid4())
    
    if sid not in sessions:
        sessions[sid] = MarsSimulator(sid)
        sessions[sid].setup_robot_model()
    
    sim = sessions[sid]
    sim.reset_state()
    
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
