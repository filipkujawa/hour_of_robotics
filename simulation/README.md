# Mars Robot Simulation Service

This is a Python-based backend that uses the [Rerun SDK](https://rerun.io) to simulate the Mars robot's behavior before executing it on the physical hardware.

## How it works
1. The frontend (Next.js) sends a JSON representation of the Blockly blocks to the `/simulate` endpoint.
2. This service starts a unique Rerun session for the user and logs 3D movement data to it.
3. It returns a WebSocket URL that the browser-based `@rerun-io/web-viewer` connects to for real-time visualization and timeline scrubbing.

## Running locally
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the service:
   ```bash
   python -m simulation.api.main
   ```
   The service will be available at `http://localhost:8000`.

## Compartmentalization
- **`core/`**: Contains the `MarsSimulator` class, which handles all Rerun-specific logging.
- **`api/`**: Contains the FastAPI application and request/response models.
- **`models/`**: (Future) Place for URDF or 3D mesh files of the robot.
