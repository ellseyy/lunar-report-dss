import json
import math
import os
import sys
import numpy as np

try:
    import rasterio
    from rasterio.enums import Resampling
except ImportError:
    print("Error: must have installed the library rasterio to work with GeoTIFF.")


def latlon_to_lola_xy(lat_deg: float, lon_deg: float, half_size_px: float, res_m: float):
    colat_rad = math.radians(90.0 - abs(lat_deg))
    r_m = 2.0 * MOON_RADIUS_M * math.tan(colat_rad / 2.0)
    lon_rad = math.radians(lon_deg)
    x_m = r_m * math.sin(lon_rad)
    y_m = r_m * math.cos(lon_rad)
    col = half_size_px + (x_m / res_m)
    row = half_size_px - (y_m / res_m)
    return int(round(col)), int(round(row))


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/process_lola_tiff.py /path/to/LDEM_80S_20M.tif")
        sys.exit(1)

    tiff_path = sys.argv[1]
    out_dir = os.path.join("src", "data")
    os.makedirs(out_dir, exist_ok=True)

    with rasterio.open(tiff_path) as src:
        print(f"Open GeoTIFF: {src.width}x{src.height}, dtype={src.dtypes[0]}, crs={src.crs}")
        scale_factor = float(src.scales[0]) if src.scales and src.scales[0] else 0.5
        offset_m = float(src.offsets[0]) if src.offsets and src.offsets[0] else 0.0
        print(f"Scale factor: scale={scale_factor}, offset={offset_m}")

        step_factor = int(HORIZON_STEP_M // SCALE_M_PER_PX)  # 5
        out_h = src.height // step_factor
        out_w = src.width // step_factor

        print(f"Downsampling to {out_w}x{out_h} (step {HORIZON_STEP_M} m) for horizon tracing...")
        raw_100m = src.read(
            1,
            out_shape=(out_h, out_w),
            resampling=Resampling.average,
        )
        elev_100m = np.round(raw_100m.astype(np.float32) * scale_factor + offset_m).astype("<i2")
        bin_100m_path = os.path.join(out_dir, "lola-80s-100m.bin")
        elev_100m.tofile(bin_100m_path)

        patches_spec = {
            "shackleton_rim": (-89.45, -137.30),
            "shackleton_floor": (-89.54, 129.78),
            "malapert_massif": (-86.04, 2.70),
            "de_gerlache": (-88.50, -87.10),
        }
        patch_half = 250  # 500x500 px @ 20m = 10x10 km
        full_half = src.width / 2.0
        patches_meta = {}

        for name, (plat, plon) in patches_spec.items():
            cx, cy = latlon_to_lola_xy(plat, plon, full_half, SCALE_M_PER_PX)
            c0 = max(0, cx - patch_half)
            r0 = max(0, cy - patch_half)
            win = rasterio.windows.Window(c0, r0, patch_half * 2, patch_half * 2)
            patch_dn = src.read(1, window=win)
            patch_half_m = np.round((patch_dn.astype(np.float32) * scale_factor + offset_m) * 2.0).astype("<i2")
            patch_file = f"patch-{name}-20m.bin"
            patch_half_m.tofile(os.path.join(out_dir, patch_file))
            patches_meta[name] = {
                "file": patch_file,
                "centerLat": plat,
                "centerLon": plon,
                "col0": int(c0),
                "row0": int(r0),
                "width": int(patch_half * 2),
                "height": int(patch_half * 2),
                "resMeters": SCALE_M_PER_PX,
                "unitMeters": 0.5,
            }
            center_h = float(patch_half_m[patch_half, patch_half]) * 0.5
            print(f"Saved 20m patch '{name}' ({plat}, {plon}, h={center_h:.0f}m): {patch_file}")

        meta = {
            "sourceDataset": os.path.basename(tiff_path),
            "fullWidthPx": int(src.width),
            "fullHeightPx": int(src.height),
            "fullResMeters": SCALE_M_PER_PX,
            "horizonGridFile": "lola-80s-100m.bin",
            "horizonWidthPx": int(out_w),
            "horizonHeightPx": int(out_h),
            "horizonResMeters": HORIZON_STEP_M,
            "patches": patches_meta,
        }
        with open(os.path.join(out_dir, "lola-meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        print("Done! Metadata written to src/data/lola-meta.json")


if __name__ == "__main__":
    main()