import { type NextRequest, NextResponse } from "next/server";
import {
  composeFullMissionReport,
  makeFallbackReport,
  reportJsonSchema,
  validateGeneratedReport,
} from "@/lib/lunarMissionReport";
import { extractLunarTelemetryAndSources } from "@/lib/lunarTelemetryExtractor";

export const maxDuration = 120;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_SYNTHESIS_MODEL = "google/gemini-2.5-flash";
const SYNTHESIS_TIMEOUT_MS = 60_000;

type MissionReportRequest = {
  lat?: unknown;
  lon?: unknown;
  landingDate?: unknown;
  windowDays?: unknown;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: { message?: unknown };
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function messageText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .filter((part): part is { type: "text"; text: string } => {
      if (!part || typeof part !== "object") return false;
      const candidate = part as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function callOpenRouterSynthesis(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lunar-report-dss.local",
      "X-Title": "Lunar Global Mission Report Engine",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SYNTHESIS_TIMEOUT_MS),
  });

  const data = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    const detail =
      typeof data?.error?.message === "string" ? data.error.message : `HTTP ${response.status}`;
    throw new Error(`OPENROUTER_SYNTHESIS_FAILED: ${detail}`);
  }
  return data;
}

export async function POST(request: NextRequest) {
  let body: MissionReportRequest;
  try {
    body = (await request.json()) as MissionReportRequest;
  } catch {
    return jsonError("INVALID_JSON", 400);
  }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lon = typeof body.lon === "number" ? body.lon : Number(body.lon);
  const landingDate =
    typeof body.landingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.landingDate.trim())
      ? body.landingDate.trim()
      : "2026-11-15";
  const parsedWindow =
    typeof body.windowDays === "number" ? body.windowDays : Number(body.windowDays);
  const windowDays =
    Number.isInteger(parsedWindow) && parsedWindow >= 1 && parsedWindow <= 30 ? parsedWindow : 14;

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return jsonError("INVALID_LATITUDE_GLOBAL_RANGE", 400);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return jsonError("INVALID_LONGITUDE_RANGE", 400);
  }

  const { telemetry, sources, ephemerisMode } = await extractLunarTelemetryAndSources({
    lat,
    lon,
    landingDate,
    windowDays,
    profile: "clps",
  });

  const synthesisModel = process.env.OPENROUTER_SYNTHESIS_MODEL || DEFAULT_SYNTHESIS_MODEL;
  const models = { extraction: ephemerisMode, synthesis: synthesisModel };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      report: makeFallbackReport(telemetry, sources, models),
    });
  }

  try {
    const frozenSources = sources.map((s) => ({
      id: s.id,
      name: s.name,
      publisher: s.publisher,
      domain: s.domain,
      usage: s.usage,
    }));

    const synthesis = await callOpenRouterSynthesis(apiKey, {
      model: synthesisModel,
      max_completion_tokens: 2_048,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lunar_mission_report",
          strict: true,
          schema: reportJsonSchema,
        },
      },
      messages: [
        {
          role: "system",
          content: [
            "You are a Lunar Global CLPS Lander Mission Planning Analyst writing clear, plain-English engineering reports.",
            "Return ONLY valid JSON matching the exact schema.",
            "STRICT ANTI-HALLUCINATION RULE: Use ONLY the exact numbers provided in the user JSON payload. NEVER output JSON field names or camelCase code identifiers.",
            "THRESHOLD COMPARISON RULE: Compare like with like ONLY. Compare 'maxEclipseHours' against 'eclipseBatteryLimitHours'. Compare 'sunlightPercent' against 'targetSunlightPercent'. Compare 'maxBlackoutHours' against 'blackoutBufferLimitHours'.",
            "FAVORABLE FACTORS RULE: 'favorable' can have 0 to 3 items. ONLY include metrics that genuinely passed their threshold with margin (status PASS in criteriaTable). Never invent favorable items.",
            "RELAY RULE: Follow 'relayRequired' strictly.",
            "SUMMARY INSTRUCTIONS (4 to 5 clear sentences):",
            "1. State the site name, coordinates, verdict (GO, CONDITIONAL, or NO-GO) for CLPS Lander, elevation, and whether ground slope meets the 8° tilt limit.",
            "2. Explain solar power: sunlight hours and percentage, peak solar elevation, and compare maximum continuous eclipse duration against the 36-hour battery survival limit.",
            "3. Explain Earth communications: Direct-to-Earth uptime percentage, maximum continuous blackout against the 24-hour autonomous buffer limit, and whether an orbital relay is required.",
            "4. State the distance to Permanently Shadowed Regions (or polar distance) and conclude with the primary engineering takeaway.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            missionProfile: telemetry.meta.profile,
            siteName: telemetry.siteName,
            coordinates: {
              latitude: `${Math.abs(telemetry.lat).toFixed(2)}° ${telemetry.lat >= 0 ? "N" : "S"}`,
              longitude: `${Math.abs(telemetry.lon).toFixed(2)}° ${telemetry.lon >= 0 ? "E" : "W"}`,
            },
            verdict: telemetry.verdict,
            relayRequired: telemetry.relayRequired,
            insidePermanentlyShadowedRegion: telemetry.isInsidePsr,
            criteriaTable: telemetry.scoreBreakdown,
            measurements: {
              elevationMeters: telemetry.rawNumbers.elevationM,
              slopeDegrees: telemetry.rawNumbers.slopeDeg,
              slopeLimitDegrees: telemetry.rawNumbers.maxSlopeLimitDeg,
              horizonObstructionDegrees: telemetry.rawNumbers.horizonBlockDeg,
              minHorizonDegrees: telemetry.rawNumbers.minHorizonDeg,
              distanceToPsrKm: telemetry.rawNumbers.psrDistKm,
              sunlightHours: telemetry.rawNumbers.sunlightHours,
              sunlightPercent: telemetry.rawNumbers.sunlightPct,
              targetSunlightPercent: telemetry.rawNumbers.targetSunPct,
              peakSunElevationDegrees: telemetry.rawNumbers.peakSolarElevDeg,
              maxEclipseHours: telemetry.rawNumbers.maxEclipseHours,
              eclipseBatteryLimitHours: telemetry.rawNumbers.maxEclipseSafeHrs,
              dteUptimePercent: telemetry.rawNumbers.dteUptimePct,
              maxBlackoutHours: telemetry.rawNumbers.maxBlackoutHours,
              blackoutBufferLimitHours: telemetry.rawNumbers.maxBlackoutLimitHrs,
            },
            frozenSources,
          }),
        },
      ],
    });

    const synthesisText = messageText(synthesis.choices?.[0]?.message?.content);
    if (!synthesisText) {
      return NextResponse.json({
        report: makeFallbackReport(telemetry, sources, models),
      });
    }

    const validatedSynthesis = validateGeneratedReport(
      JSON.parse(synthesisText),
      sources,
      telemetry,
    );
    const fullReport = composeFullMissionReport(telemetry, validatedSynthesis, sources, models);

    return NextResponse.json({ report: fullReport });
  } catch (error) {
    console.error("OpenRouter global lunar synthesis failed, using telemetry-backed fallback:", error);
    return NextResponse.json({
      report: makeFallbackReport(telemetry, sources, models),
    });
  }
}