# lunar-report-dss

Global lunar landing-site evaluation and Decision Support System (DSS) for the **NASA CLPS Lander** (*Commercial Lunar Payload Services*) profile across `100%` of the lunar surface (`-90°..+90°` lat, `-180°..+180°` lon).

Computes deterministic terrain slope, `360°` curvature-corrected horizon masking, hourly solar/DTE visibility, and `GO / CONDITIONAL / NO-GO` verdicts from NASA LRO LOLA elevation rasters and JPL Horizons DE440 ephemerides, with an optional schema-constrained and post-validated LLM synthesis layer.

---

## Architecture & Data Flow

```text
POST /api/mission-report { lat, lon, landingDate, windowDays }
  │
  ├──► 1. Terrain & Horizon Extraction (lunarTelemetryExtractor.ts)
  │       ├── -81°..+90° : Global LDEM_64 Int16 grid (11520×5760, 32 ppd, ~947.6 m/px eq.)
  │       ├── -81°..-90° : Polar stereographic LOLA 100 m/px (6080×6080) + 20 m/px patches
  │       └── 36-azimuth spherical raycasting with lunar curvature drop d²/(2R)
  │
  ├──► 2. Ephemeris & Hourly Visibility Simulation
  │       ├── Primary  : NASA JPL Horizons API (DE440)
  │       ├── Fallback : Analytical synodic cycle (29.5306 d) + optical Earth libration
  │       └── Limb offsets: Sun +0.27°, Earth +0.95° vs. 36-sector horizon profile
  │
  ├──► 3. Deterministic Scoring & Verdict (lunarMissionReport.ts)
  │       └── Evaluates CLPS Lander thresholds → GO | CONDITIONAL | NO-GO
  │
  └──► 4. Narrative Synthesis & Guardrails
          ├── OpenRouter (strict JSON Schema) → validateGeneratedReport()
          └── Fallback: deterministic makeFallbackReport() (if no key or validation fails)
```

---

## Elevation Datasets & Geospatial Model

All elevation grids are stored as little-endian `Int16` binary arrays in `src/data/` and loaded lazily into memory on the server:

| Dataset | Coverage | Grid / Resolution | Vertical Unit | File |
| :--- | :--- | :--- | :--- | :--- |
| **LOLA `LDEM64_PA_pixel_202405`** | `-90°..+90°` (used `-81°..+90°`) | `11520 × 5760` (`32 ppd`, `947.6 m/px` eq.) | `1.0 m` (`-9,109 m` .. `+10,744 m`) | `lunar-global-dem.bin` (`127 MB`) |
| **LOLA `LDEM_80S_20MPP_ADJ`** | `-80°..-90°` South Pole | `6080 × 6080` (`100 m/px` stereographic) | `1.0 m` | `lola-80s-100m.bin` (`71 MB`) |
| **High-Res Polar Patches** | Shackleton Rim/Floor, Malapert Massif, de Gerlache | `500 × 500` each (`20 m/px`) | `0.5 m` | `patch-*-20m.bin` (`488 KB` × 4) |

### Terrain & Raycasting Details
- **Bilinear Interpolation & Slope:** Local slope is computed via central differences with meridian convergence (`cos(φ)` clamped at `0.08` near poles) over `R = 1,737,400 m`.
- **36-Sector Horizon Masking:** Casts rays every `10°` of azimuth (`0°..350°`), accounting for lunar curvature drop `d² / (2R)` up to `100 km` on the global grid and `1200` steps (`100 m/px`) on the South Polar grid.
- **PSR Detection:** Flags Permanently Shadowed Regions when `|lat| >= 85.5°`, minimum horizon elevation `> 1.8°`, and elevation `< -1,500 m`.

---

## CLPS Lander Engineering Profile

The API enforces the `clps` profile (`MISSION_PROFILES.clps` in `src/lib/lunarMissionReport.ts`):

| Parameter | Nominal / Target | Limit (`CONDITIONAL`) | `NO-GO` Threshold |
| :--- | :--- | :--- | :--- |
| **Touchdown Slope** | `≤ 6.5°` | `≤ 8.0°` | `> 11.0°` |
| **Solar Illumination** | `≥ 75%` | `25%..74.9%` | `< 25%` |
| **Max Continuous Eclipse** | `≤ 36 hrs` | `> 36 hrs` | — |
| **Direct-to-Earth (DTE)** | `≥ 60%` | `10%..59.9%` | `< 10%` |
| **Max Continuous Blackout** | `≤ 24 hrs` | `> 24 hrs` *(requires orbital relay)* | — |

---

## Anti-Hallucination LLM Pipeline

When `OPENROUTER_API_KEY` is configured, `POST /api/mission-report` calls OpenRouter (`google/gemini-2.5-flash` by default, `60s` timeout, `strict: true` JSON Schema) **only** to generate the plain-English engineering summary and factor cards from frozen telemetry.

Every LLM response is checked by `validateGeneratedReport()` before returning to the client:
1. **Numeric Grounding:** Rejects any numbers not traceable to the deterministic telemetry or `CLPS` profile constants.
2. **Identifier Leakage:** Blocks leaked `camelCase` variable names or internal schema keys.
3. **Semantic Consistency:** Catches conflation of total sunlight hours with the `36 h` battery eclipse limit, relay-requirement contradictions, and false `favorable` cards when criteria failed.
4. **Deterministic Fallback:** If `OPENROUTER_API_KEY` is unset, the request times out, or validation fails, `makeFallbackReport()` produces a fully compliant report deterministically.

---

## Tech Stack

- **Runtime & UI:** Next.js `16.4.6` (App Router, Turbopack), React `19.3.0`, TypeScript `5`, Tailwind CSS `4.3.3`, `lucide-react`
- **Validation:** Zod `4.6.7` + OpenRouter Structured Outputs (`strict: true`)
- **Geospatial ETL:** Python 3, `uv`, `rasterio`, `numpy`
- **Testing:** Vitest `5.1.0` (`24` unit & integration tests)

---

## Project Structure

```text
lunar-report-dss/
├── scripts/
│   ├── build-global-dem.py              # Converts NASA LDEM_64 GeoTIFF/IMG → Int16 .bin + meta JSON
│   ├── process_lola_tiff.py             # Processes polar LOLA GeoTIFFs into 100 m/px & 20 m/px grids
│   ├── prepare_lola_dataset.py          # Polar dataset preparation helper
│   └── generate_lola_json.mjs           # Generates polar JSON metadata
├── src/
│   ├── app/
│   │   ├── api/mission-report/route.ts  # POST /api/mission-report endpoint
│   │   ├── globals.css                  # Tailwind CSS 4 configuration & theme
│   │   ├── layout.tsx                   # Root layout
│   │   └── page.tsx                     # Interactive DSS UI (presets, coordinates, history, stages)
│   ├── components/
│   │   ├── AsciiLunarIdle.tsx           # Idle state visualization
│   │   ├── LunarMissionReport.tsx       # Verdict banner, solar timeline bar, telemetry & tabs
│   │   ├── MissionDatePicker.tsx        # UTC landing epoch selector
│   │   └── TacticalDatePicker.tsx       # Calendar grid control
│   ├── data/                            # Pre-built Int16 DEMs & JSON metadata
│   └── lib/
│       ├── __tests__/lunarMissionReport.test.ts  # 24 Vitest specs
│       ├── lunarMissionReport.ts        # Schemas, CLPS limits, validator, fallback report builder
│       └── lunarTelemetryExtractor.ts   # DEM loader, raycasting, Horizons client, fallback ephemeris
├── next.config.ts                       # outputFileTracingIncludes for src/data/**/*
├── package.json
└── vitest.config.ts
```

---

## Local Setup

### Prerequisites
- **Node.js** `>= 20.x`, **npm** `>= 10.x`
- **Git LFS** (required if `src/data/*.bin` binaries are tracked via LFS)

### Install & Run
```bash
git clone <REPOSITORY_URL>
cd lunar-report-dss
git lfs pull
npm install
npm run dev
```
Open `http://localhost:3000`.

### Environment Variables (`.env.local`)
```env
# Optional: enables LLM engineering narrative via OpenRouter.
# If omitted, the deterministic makeFallbackReport() generator is used.
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: override default synthesis model (default: google/gemini-2.5-flash)
OPENROUTER_SYNTHESIS_MODEL=google/gemini-2.5-flash
```

---

## Rebuilding the Global DEM (Optional)

Pre-built binaries are included in `src/data/`. To regenerate `lunar-global-dem.bin` from a raw NASA PDS `LDEM_64` GeoTIFF/IMG using `uv`:

```bash
uv run --with rasterio --with numpy python -u scripts/build-global-dem.py <path_to_LDEM64.tif>
```

---

## API Reference: `POST /api/mission-report`

### Request (`application/json`)
```json
{
  "lat": 0.67,
  "lon": 23.47,
  "landingDate": "2026-11-15",
  "windowDays": 14
}
```

| Field | Type | Default | Constraints |
| :--- | :--- | :--- | :--- |
| `lat` | `number` | *required* | `[-90, 90]` (selenographic latitude) |
| `lon` | `number` | *required* | `[-180, 180]` (selenographic longitude) |
| `landingDate` | `string` | `"2026-11-15"` | `YYYY-MM-DD` (UTC) |
| `windowDays` | `number` | `14` | Integer `[1, 30]` Earth days |

### Response (`200 OK`)
Returns `{ "report": LunarMissionReportData }`:
- `verdict`: `"GO" | "CONDITIONAL" | "NO-GO"`
- `headline`: Matched catalog landmark (e.g. `MARE TRANQUILLITATIS (APOLLO 11)`) or regional sector
- `summary`: Grounded engineering assessment
- `sunlightTimeline`: `windowDays * 24` binary hourly flags (`1` = sunlit, `0` = shadow)
- `params`: Formatted telemetry (`slope`, `elevation`, `horizon`, `sunlight`, `peakElev`, `eclipse`, `dte`, `blackout`, `psr`)
- `favorable` & `risks`: Criteria-backed cards linked to NASA source IDs

### Error Responses
- `400 INVALID_JSON` — Malformed JSON payload
- `400 INVALID_LATITUDE_GLOBAL_RANGE` — `lat` missing, non-finite, or outside `[-90, 90]`
- `400 INVALID_LONGITUDE_RANGE` — `lon` missing, non-finite, or outside `[-180, 180]`

---

## Testing & Production Build

```bash
# Run all 24 Vitest tests (historic sites, ±90° poles, ±180° seam, phases, validator, API route)
npm test

# Lint & production build
npm run lint
npm run build
npm run start
```

> **Deployment Note:** `next.config.ts` sets `outputFileTracingIncludes: { "/api/mission-report": ["./src/data/**/*"] }` so Next.js traces and bundles the `~198 MB` of binary elevation grids into the `/api/mission-report` server bundle. Ensure your deployment target supports the bundle size and has Git LFS enabled if binaries are stored in LFS.
