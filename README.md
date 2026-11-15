# Lunar Global Landing Decision Support System (`lunar-report-dss`)

An engineering Decision Support System (DSS) for evaluating lunar landing sites across the **entire surface of the Moon** (`-90°..+90°` latitude and `-180°..+180°` longitude) tailored to the **NASA CLPS Lander** (*Commercial Lunar Payload Services*) mission profile.

The system integrates the global **NASA LRO LOLA (`LDEM_64`)** Digital Elevation Model, high-resolution polar rasters (`20 m/px` and `100 m/px`), Sun and Earth ephemeris calculations (**JPL Horizons DE440** + spherical analytical fallback), and a deterministically validated LLM synthesis pipeline with strict anti-hallucination guardrails.

---

## Key Features

* **Global Lunar Coverage (`100%` of the Surface):**
  * **Latitudes `-81°..+90°`:** Global equirectangular `LDEM_64` elevation grid (`11520 × 5760` pixels, `32 ppd` / `~947 m/px` at the equator, elevation range from `-9,109 m` to `+10,744 m`).
  * **South Polar Region (`-81°..-90°`):** Seamless transition to the polar stereographic `LOLA 100m/px` grid and local `20m/px` high-resolution patches (Shackleton Rim/Floor, Connecting Ridge, Malapert Massif, de Gerlache).
* **Spherical 360° Horizon Raycasting:** Local terrain slope calculation accounting for meridian convergence $\cos(\varphi)$ and 36-azimuth raytracing corrected for lunar curvature ($R = 1,737.4\text{ km}$).
* **Orbital Ephemeris & Earth Communications:**
  * Live integration with **NASA JPL Horizons API (DE440)** with automatic fallback to a high-precision spherical synodic cycle (`29.53 days`) and optical Earth libration model when offline.
  * Hourly simulation of solar illumination (accounting for the Sun's `+0.27°` upper limb) and Direct-to-Earth (**DTE**) radio line-of-sight (accounting for Earth's `+0.95°` upper limb).
* **Fixed `CLPS Lander` Engineering Profile:**
  * Maximum allowable touchdown tilt: **$\le 8.0^\circ$** (nominal safe threshold $\le 5.0^\circ$).
  * Battery survival limit in continuous shadow: **$\le 36\text{ hrs}$**.
  * Maximum continuous communications blackout before requiring an orbital relay: **$\le 24\text{ hrs}$**.
  * Target mission window illumination: **$\ge 75\%$** (`NO-GO` threshold $< 45\%$).
* **Anti-Hallucination LLM Pipeline:**
  * All physical and astronomical metrics are computed deterministically in TypeScript prior to invoking the language model.
  * A strict post-validator (`validateGeneratedReport`) verifies every number in the LLM output against raw telemetry, blocks leaked `camelCase` identifiers, prevents conflating sunlight hours with battery eclipse limits, and enforces relay rules.

---

## Tech Stack

* **Frontend & Backend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5
* **Styling:** Tailwind CSS 4 (high-contrast monochrome telemetry interface)
* **Geospatial Processing (ETL):** Python 3, `uv`, `rasterio`, `numpy`
* **LLM Synthesis:** OpenRouter API (`google/gemini-2.5-flash` with `strict: true` JSON Schema) + deterministic `makeFallbackReport`
* **Testing:** Vitest (24 automated physical, astronomical, validator, and API integration tests)

---

## Project Structure

```text
lunar-report-dss/
├── scripts/
│   └── build-global-dem.py              # Python ETL script converting NASA LDEM_64 GeoTIFF to Int16 .bin + JSON
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── mission-report/
│   │   │       └── route.ts             # POST /api/mission-report — input validation, telemetry & LLM synthesis
│   │   ├── globals.css                  # Global Tailwind CSS styles
│   │   ├── layout.tsx                   # Root application layout
│   │   └── page.tsx                     # Main UI: coordinate form, global presets, history, simulation progress
│   ├── components/
│   │   └── LunarMissionReport.tsx       # Report card UI: verdict, summary, solar rhythm bar, 3 metric columns, tabs
│   ├── data/                            # Binary elevation grids & metadata (bundled via next.config.ts)
│   │   ├── lunar-global-dem.bin         # Global LDEM_64 elevation grid (11520x5760 Int16, 126.6 MB)
│   │   ├── lunar-global-meta.json       # Global grid metadata (resolution, min/max elevation)
│   │   ├── lola-80s-100m.bin            # South Polar stereographic grid (100 m/px)
│   │   ├── lola-meta.json               # Polar grid & high-resolution patch metadata
│   │   └── patch-*.bin                  # Local 20 m/px polar patches (Shackleton, Malapert, de Gerlache)
│   └── lib/
│       ├── __tests__/
│       │   └── lunarMissionReport.test.ts  # 24 tests: geometry, poles, lunar phases, validator, API route
│       ├── lunarMissionReport.ts        # Data schemas, CLPS Lander limits, report validator & fallback generator
│       └── lunarTelemetryExtractor.ts   # DEM loader, bilinear interpolation, raycasting, JPL Horizons API
├── next.config.ts                       # outputFileTracingIncludes configuration for src/data/**/*
├── package.json                         # Dependencies and npm scripts
├── tsconfig.json                        # TypeScript configuration
└── vitest.config.ts                     # Vitest runner configuration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
* **Node.js** `>= 20.x`
* **npm** `>= 10.x`
* **Git LFS** (if binary `.bin` elevation rasters are tracked via Git LFS)

### 2. Installation
```bash
git clone <REPOSITORY_URL>
cd lunar-report-dss
git lfs pull   # fetch src/data/*.bin if tracked via Git LFS
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the project root:
```env
# OpenRouter API key for generating the plain-English engineering summary (LLM)
# If omitted, the system automatically uses the deterministic makeFallbackReport template
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: override the synthesis model (defaults to google/gemini-2.5-flash)
OPENROUTER_SYNTHESIS_MODEL=google/gemini-2.5-flash
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Rebuilding the Global DEM from Source GeoTIFF (Optional)

Pre-built rasters (`src/data/lunar-global-dem.bin` and `src/data/lunar-global-meta.json`) are already included. To regenerate the global grid from a raw NASA PDS GeoTIFF (`LDEM64_PA_pixel_202405.tif`) at a custom resolution (`TARGET_PPD`), run the Python ETL script via `uv`:

```bash
uv run --with rasterio --with numpy python -u scripts/build-global-dem.py <path_to_LDEM64.tif>
```

The script resamples the dataset via bilinear interpolation into a compact `Int16` binary array (`1 meter` per unit) and writes the output files to `src/data/`.

---

## API Specification (`POST /api/mission-report`)

The application exposes a REST endpoint for integration with external mission planning workflows.

### Request (`application/json`)
```json
{
  "lat": 0.67,
  "lon": 23.47,
  "landingDate": "2026-11-18",
  "windowDays": 14
}
```

| Field | Type | Range / Format | Description |
| :--- | :--- | :--- | :--- |
| `lat` | `number` | `-90.0` .. `+90.0` | Selenographic latitude (`+` North, `-` South) |
| `lon` | `number` | `-180.0` .. `+180.0` | Selenographic longitude (`+` East, `-` West) |
| `landingDate` | `string` | `YYYY-MM-DD` (UTC) | Landing epoch date (defaults to `"2026-11-15"`) |
| `windowDays` | `number` | Integer `1` .. `30` | Mission window duration in Earth days (defaults to `14`) |

### Response (`200 OK`)
Returns `{ "report": LunarMissionReportData }`, containing:
* `verdict`: `"GO" | "CONDITIONAL" | "NO-GO"`
* `headline`: Site title with matched catalog landmark (e.g., `MARE TRANQUILLITATIS (APOLLO 11)`) or regional sector classification
* `summary`: Validated 4–5 sentence engineering summary
* `sunlightTimeline`: Array of `windowDays * 24` hourly flags (`1` = sunlit, `0` = shadow)
* `params`: Formatted telemetry values (`slope`, `elevation`, `horizon`, `sunlight`, `peakElev`, `eclipse`, `dte`, `blackout`, `psr`)
* `favorable` & `risks`: Structured supporting factors and engineering constraints cited against NASA data sources

### Error Codes
* `400 INVALID_JSON` — Malformed request payload
* `400 INVALID_LATITUDE_GLOBAL_RANGE` — Latitude outside `[-90, 90]`
* `400 INVALID_LONGITUDE_RANGE` — Longitude outside `[-180, 180]`

---

## Testing & Production Build

### Run Automated Tests (24 Vitest Specs)
Validates historic landing sites (`Apollo 11`, `Apollo 17`, `Chang'e-4`, `Peary`, `Shackleton`), polar singularities (`±90°`), the `-81°` grid seam, the `±180°` date line, lunar phases, the anti-hallucination validator, and the API route:
```bash
npx vitest run
```

### Build & Run Production Server
```bash
npm run build
npm run start
```

> **Deployment Note (Vercel / Docker):**
> `next.config.ts` configures `outputFileTracingIncludes: { "/api/mission-report": ["./src/data/**/*"] }` so Next.js bundles `src/data/*.bin` into the serverless/server build. When deploying via GitHub, ensure binary rasters are tracked via **Git LFS** (with Git LFS enabled in your hosting provider settings) and `OPENROUTER_API_KEY` is set in environment variables.