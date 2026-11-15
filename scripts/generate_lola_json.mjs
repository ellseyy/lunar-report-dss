import fs from "node:fs";
import path from "node:path";

const GRID_SIZE = 120;
const RADIUS_CELLS = 60;
const CELL_SIZE_M = 2500;
const elevations = new Float32Array(GRID_SIZE * GRID_SIZE);

function gridToPolar(gx, gy) {
  const dx = (gx - RADIUS_CELLS) / RADIUS_CELLS;
  const dy = (gy - RADIUS_CELLS) / RADIUS_CELLS;
  const rNorm = Math.hypot(dx, dy);
  const lat = -90 + rNorm * 5.0;
  const lon = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { lat, lon };
}

for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    const { lat, lon } = gridToPolar(x, y);
    const colat = 90 - Math.abs(lat);

    let h = 250;

    // 1. Crater Shackleton: flat floor of PSR (< 0.18°), inner slope (0.18°..0.25°), terrace of rim (0.25°..0.42°)
    if (colat < 0.18) {
      h = -2850 + 450 * Math.pow(colat / 0.18, 2.0);
    } else if (colat < 0.25) {
      const t = (colat - 0.18) / 0.07;
      h = -2400 + 3800 * t;
    } else {
      h += 1150 * Math.exp(-Math.pow((colat - 0.33) / 0.35, 2));
    }

    // 2. Connecting Ridge (-89.68°, -129.20°)
    const dLatRidge = (lat - -89.68) / 0.38;
    const dLonRidge = (lon - -129.2) / 50.0;
    h += 320 * Math.exp(-(dLatRidge * dLatRidge + dLonRidge * dLonRidge));

    // 3. Peak Malapert  (-85.95°, -2.40°)
    const dLatMalapert = (lat - -85.95) / 0.65;
    const dLonMalapert = (lon - -2.4) / 18.0;
    h += 4450 * Math.exp(-(dLatMalapert * dLatMalapert + dLonMalapert * dLonMalapert));

    // 4. Crater de Gerlache (-88.50°, -87.10°)
    const dLatGerlache = (lat - -88.5) / 0.38;
    const dLonGerlache = (lon - -87.1) / 18.0;
    h -= 2750 * Math.exp(-(dLatGerlache * dLatGerlache + dLonGerlache * dLonGerlache));

    h += 35 * Math.sin(x * 0.35) * Math.cos(y * 0.31);
    elevations[y * GRID_SIZE + x] = Math.round(h);
  }
}

const payload = {
  gridSize: GRID_SIZE,
  cellSizeMeters: CELL_SIZE_M,
  bounds: { latMin: -90.0, latMax: -85.0, lonMin: -180.0, lonMax: 180.0 },
  elevations: Array.from(elevations),
};

const outPath = path.join(process.cwd(), "src/data/lola-south-pole.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Updated LOLA grid -> ${outPath}`);