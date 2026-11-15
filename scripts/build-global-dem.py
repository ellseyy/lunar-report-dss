import json
import sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling

def main():
    if len(sys.argv) < 2:
        print("Usage: uv run --with rasterio --with numpy python scripts/build-global-dem.py <path_to_ldem_64.tif_or_img>")
        sys.exit(1)

    input_path = Path(sys.argv[1]).expanduser().resolve()
    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    out_dir = Path("src/data").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Target resolution: 32 pixels per degree (11520 x 5760 = ~132 MB in Int16, step ~947 m at the equator)
    # If you need something more compact (33 MB), change TARGET_PPD to 16
    TARGET_PPD = 32
    target_width = 360 * TARGET_PPD
    target_height = 180 * TARGET_PPD

    print(f"Opening {input_path.name}...")
    with rasterio.open(input_path) as src:
        print(f"Original size: {src.width}x{src.height}, dtype={src.dtypes[0]}, tags={src.tags()}")
        scale = src.scales[0] if src.scales and src.scales[0] else 1.0
        offset = src.offsets[0] if src.offsets and src.offsets[0] else 0.0

        # If LOLA stores heights in centimeters (scale=0.5), convert to meters
        data = src.read(
            1,
            out_shape=(target_height, target_width),
            resampling=Resampling.bilinear,
        )

        elev_meters = np.round(data.astype(np.float32) * scale + offset).astype(np.int16)

    bin_filename = "lunar-global-dem.bin"
    bin_path = out_dir / bin_filename
    elev_meters.tofile(bin_path)

    meta = {
        "sourceDataset": f"NASA LRO LOLA {input_path.stem} (Global {TARGET_PPD}ppd)",
        "projection": "equirectangular",
        "width": target_width,
        "height": target_height,
        "ppd": TARGET_PPD,
        "resMetersEquator": round((2 * 3.141592653589793 * 1_737_400) / target_width, 1),
        "unitMeters": 1,
        "minElevationM": int(elev_meters.min()),
        "maxElevationM": int(elev_meters.max()),
        "gridFile": bin_filename,
    }

    meta_path = out_dir / "lunar-global-meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Done! Grid saved to {bin_path} ({bin_path.stat().st_size / 1024 / 1024:.1f} MB)")
    print(f"Height range: from {meta['minElevationM']} m to {meta['maxElevationM']} m")
    print(f"Metadata: {meta_path}")

if __name__ == "__main__":
    main()