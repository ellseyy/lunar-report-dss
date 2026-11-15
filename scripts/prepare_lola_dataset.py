import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window

def extract_south_pole_patch(tif_path: str, output_path: str, size: int = 120):
    with rasterio.open(tif_path) as src:
        cx, cy = src.width // 2, src.height // 2
        half = size // 2
        window = Window(cx - half, cy - half, size, size)
        elevation_grid = src.read(1, window=window).astype(np.float32)

    payload = {
        "gridSize": size,
        "cellSizeMeters": 250,
        "bounds": {"latMin": -89.95, "latMax": -88.50, "lonMin": -180.0, "lonMax": 180.0},
        "elevations": np.round(elevation_grid, 1).flatten().tolist(),
    }
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(json.dumps(payload))

if __name__ == "__main__":
    extract_south_pole_patch("LDEM_80S_20M.tif", "src/data/lola-south-pole.json")