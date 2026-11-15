import { z } from "zod";

export const verdictLabels = ["GO", "CONDITIONAL", "NO-GO"] as const;
export type VerdictLabel = (typeof verdictLabels)[number];

export const missionProfileIds = ["clps", "hls", "rover"] as const;
export type MissionProfileId = (typeof missionProfileIds)[number];

export interface MissionProfileSpec {
  id: MissionProfileId;
  shortLabel: string;
  label: string;
  maxSlopeDeg: number;
  safeSlopeDeg: number;
  noGoSlopeDeg: number;
  targetSunPct: number;
  noGoSunPct: number;
  targetDtePct: number;
  noGoDtePct: number;
  maxEclipseSafeHrs: number;
  maxBlackoutLimitHrs: number;
}

export const MISSION_PROFILES: Record<MissionProfileId, MissionProfileSpec> = {
  clps: {
    id: "clps",
    shortLabel: "CLPS",
    label: "CLPS Lander",
    maxSlopeDeg: 8.0,
    safeSlopeDeg: 6.5,
    noGoSlopeDeg: 11.0,
    targetSunPct: 75,
    noGoSunPct: 25,
    targetDtePct: 60,
    noGoDtePct: 10,
    maxEclipseSafeHrs: 36,
    maxBlackoutLimitHrs: 24,
  },
  hls: {
    id: "hls",
    shortLabel: "HLS",
    label: "Artemis HLS",
    maxSlopeDeg: 5.0,
    safeSlopeDeg: 4.0,
    noGoSlopeDeg: 7.5,
    targetSunPct: 80,
    noGoSunPct: 35,
    targetDtePct: 75,
    noGoDtePct: 25,
    maxEclipseSafeHrs: 24,
    maxBlackoutLimitHrs: 12,
  },
  rover: {
    id: "rover",
    shortLabel: "ROVER",
    label: "Lunar Rover",
    maxSlopeDeg: 15.0,
    safeSlopeDeg: 12.0,
    noGoSlopeDeg: 20.0,
    targetSunPct: 45,
    noGoSunPct: 15,
    targetDtePct: 45,
    noGoDtePct: 5,
    maxEclipseSafeHrs: 72,
    maxBlackoutLimitHrs: 48,
  },
};

export interface ScoreCriterionRow {
  criterion: string;
  value: string;
  threshold: string;
  margin: string;
  status: "PASS" | "WARN" | "FAIL";
}

export interface SiteHistoricalContext {
  badge: string;
  title: string;
  description: string;
}

export const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "Source URL must use HTTPS"),
  publisher: z.string().min(1),
  domain: z.string().min(1),
  usage: z.string().min(1).max(2_000),
});

export const favorableFactorSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tag: z.enum(["LOLA DEM", "JPL HORIZONS", "SKYFIELD", "MISSION SPECS"]),
  sourceIds: z.array(z.string().min(1)).min(1),
});

export const riskItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
});

export const generatedReportSchema = z.object({
  summary: z.string().min(1),
  favorable: z.array(favorableFactorSchema).max(3),
  risks: z.array(riskItemSchema).min(1).max(4),
});

export type LunarSource = z.infer<typeof sourceSchema>;
export type GeneratedLunarSynthesis = z.infer<typeof generatedReportSchema>;

export interface InvariantTelemetry {
  siteName: string;
  siteContext: SiteHistoricalContext | null;
  lat: number;
  lon: number;
  landingDate: string;
  windowDays: number;
  profileId: MissionProfileId;
  viabilityScore: number;
  verdict: VerdictLabel;
  relayRequired: boolean;
  isInsidePsr: boolean;
  demResolutionLabel: string;
  demUncertaintyNote: string;
  computedAtUtc: string;
  scoreBreakdown: ScoreCriterionRow[];
  sunlightTimeline: number[];
  meta: {
    profile: string;
    window: string;
    relay: string;
  };
  params: {
    slope: string;
    slopeNote: string;
    elevation: string;
    horizon: string;
    psr: string;
    sunlight: string;
    peakElev: string;
    eclipse: string;
    dte: string;
    blackout: string;
  };
  rawNumbers: {
    maxSlopeLimitDeg: number;
    safeSlopeDeg: number;
    noGoSlopeDeg: number;
    maxBlackoutLimitHrs: number;
    maxEclipseSafeHrs: number;
    targetSunPct: number;
    noGoSunPct: number;
    targetDtePct: number;
    noGoDtePct: number;
    totalWindowHours: number;
    slopeDeg: number;
    slopeUncertaintyDeg: number;
    elevationM: number;
    elevationUncertaintyM: number;
    horizonBlockDeg: number;
    minHorizonDeg: number;
    psrDistKm: number;
    sunlightHours: number;
    sunlightPct: number;
    sunlightUncertaintyPct: number;
    peakSolarElevDeg: number;
    maxEclipseHours: number;
    dteUptimePct: number;
    maxBlackoutHours: number;
    shift29dSunlightDeltaHours: number;
    shift29dDteDeltaPct: number;
    nearbyNorth350mSunlightDeltaHours: number;
  };
}

export type LunarMissionReportData = GeneratedLunarSynthesis & {
  scoreBadge: string;
  windowBadge: string;
  headline: string;
  footerCoords: string;
  verdict: VerdictLabel;
  relayRequired: boolean;
  demResolutionLabel: string;
  demUncertaintyNote: string;
  computedAtUtc: string;
  scoreBreakdown: ScoreCriterionRow[];
  siteContext: SiteHistoricalContext | null;
  sunlightTimeline: number[];
  meta: InvariantTelemetry["meta"];
  params: InvariantTelemetry["params"];
  sources: LunarSource[];
  models: { extraction: string; synthesis: string };
};

const FORBIDDEN_CODE_IDENTIFIERS = [
  "maxSlopeLimitDeg",
  "maxBlackoutLimitHrs",
  "maxEclipseSafeHrs",
  "maxEclipseHours",
  "maxBlackoutHours",
  "dteUptimePct",
  "peakSolarElevDeg",
  "psrDistKm",
  "relayRequired",
  "sunlightPct",
  "sunlightHours",
];

export function validateGeneratedReport(
  value: unknown,
  sources: LunarSource[],
  telemetry?: InvariantTelemetry,
): GeneratedLunarSynthesis {
  const report = generatedReportSchema.parse(value);
  const sourceIds = new Set(sources.map((s) => s.id));
  const items = [...report.favorable, ...report.risks];

  for (const item of items) {
    if (item.sourceIds.some((id) => !sourceIds.has(id))) {
      throw new Error("REPORT_REFERENCES_UNKNOWN_SOURCE");
    }
  }
  if (items.length === 0) {
    throw new Error("REPORT_VERDICT_HAS_NO_CITED_EVIDENCE");
  }
  if (sources.length === 0) {
    throw new Error("REPORT_VERDICT_HAS_NO_SOURCES");
  }

  const fullText = [
    report.summary,
    ...report.favorable.map((f) => `${f.title} ${f.body}`),
    ...report.risks.map((r) => `${r.title} ${r.body}`),
  ].join(" ");

  for (const key of FORBIDDEN_CODE_IDENTIFIERS) {
    if (fullText.includes(key)) {
      throw new Error(`REPORT_LEAKED_VARIABLE_NAME:${key}`);
    }
  }

  if (telemetry) {
    const n = telemetry.rawNumbers;

    // 1. Restrict comparing hours of sunlight with the battery limit during eclipse
    const confusedSunlightWithBatteryPattern = new RegExp(
      `\\b${n.sunlightHours}\\s*(?:hours|hrs|h)\\s+of\\s+(?:sunlight|illumination)[^.]{0,65}(?:below|under|less than|short of|exceeds|above)[^.]{0,40}\\b(?:${n.maxEclipseSafeHrs}|${n.maxBlackoutLimitHrs})[-\\s]*(?:hour|hr|h)`,
      "i",
    );
    if (confusedSunlightWithBatteryPattern.test(fullText)) {
      throw new Error("REPORT_CONFUSED_SUNLIGHT_WITH_ECLIPSE_LIMIT");
    }

    // 2. Validate all numbers in the summary against allowed telemetry values
    const allowedNumbers = new Set<number>([
      Math.abs(telemetry.lat),
      Math.abs(telemetry.lon),
      telemetry.windowDays,
      telemetry.viabilityScore,
      n.totalWindowHours,
      100,
      0,
      n.maxSlopeLimitDeg,
      n.safeSlopeDeg,
      n.noGoSlopeDeg,
      n.maxBlackoutLimitHrs,
      n.maxEclipseSafeHrs,
      n.targetSunPct,
      n.noGoSunPct,
      n.targetDtePct,
      n.noGoDtePct,
      n.slopeDeg,
      n.slopeUncertaintyDeg,
      Math.abs(n.elevationM),
      n.elevationUncertaintyM,
      n.horizonBlockDeg,
      Math.abs(n.minHorizonDeg),
      n.psrDistKm,
      n.sunlightHours,
      n.sunlightPct,
      n.sunlightUncertaintyPct,
      Math.abs(n.peakSolarElevDeg),
      n.maxEclipseHours,
      n.dteUptimePct,
      n.maxBlackoutHours,
      Math.abs(n.shift29dSunlightDeltaHours),
      Math.abs(n.shift29dDteDeltaPct),
      Math.abs(n.nearbyNorth350mSunlightDeltaHours),
      29.5,
      350,
      20,
    ]);

    for (const token of telemetry.siteName.match(/\d+(?:\.\d+)?/g) ?? []) {
      const siteNum = Number(token);
      if (Number.isFinite(siteNum)) allowedNumbers.add(siteNum);
    }

    const summaryWithoutCommas = report.summary.replace(/(\d),(\d)/g, "$1$2");

    const matches = summaryWithoutCommas.match(/\d+(?:\.\d+)?/g) ?? [];
    for (const token of matches) {
      const num = Number(token);
      if (!Number.isFinite(num)) continue;
      const isAllowed = Array.from(allowedNumbers).some((allowed) => Math.abs(allowed - num) < 0.2);
      if (!isAllowed) {
        throw new Error(`REPORT_HALLUCINATED_NUMBER:${token}`);
      }
    }

    // 3. Validate consistency of relay requirement output
    if (
      telemetry.relayRequired &&
      /no relay required|without an orbital relay|no orbital relay|requiring no orbital relay/i.test(
        report.summary,
      )
    ) {
      throw new Error("REPORT_CONTRADICTS_RELAY_RULE");
    }
    if (
      !telemetry.relayRequired &&
      /orbital relay satellite mandatory|requires an orbital relay|relay is required|necessitating an orbital relay/i.test(
        report.summary,
      )
    ) {
      throw new Error("REPORT_CONTRADICTS_RELAY_RULE");
    }

    // 4. Filter out fabricated/invalid positives in the favorable array based on actual criterion statuses
    const slopePassed = n.slopeDeg <= n.safeSlopeDeg;
    const solarPassed = n.sunlightPct >= n.targetSunPct;
    const eclipsePassed = !telemetry.isInsidePsr && n.maxEclipseHours <= n.maxEclipseSafeHrs;
    const commsPassed = !telemetry.relayRequired && n.dteUptimePct >= n.targetDtePct;
    const psrClosePassed = !telemetry.isInsidePsr && n.psrDistKm <= 8.0;

    report.favorable = report.favorable.filter((item) => {
      const text = `${item.title} ${item.body}`.toLowerCase();
      if (/slope|tilt|grade/.test(text) && !slopePassed) return false;
      if (/sunlight|illumination|solar power/.test(text) && !solarPassed) return false;
      if (/eclipse|battery|shadow/.test(text) && !eclipsePassed) return false;
      if (/relay|direct-to-earth|dte|blackout|communication/.test(text) && !commsPassed)
        return false;
      if (/psr|permanently shadowed|volatile|ice/.test(text) && !psrClosePassed) return false;
      return true;
    });

    const passedCriteriaCount = telemetry.scoreBreakdown.filter(
      (row) => row.status === "PASS",
    ).length;
    const maxAllowedFavorable = Math.min(3, passedCriteriaCount + (psrClosePassed ? 1 : 0));

    if (report.favorable.length > maxAllowedFavorable) {
      report.favorable = report.favorable.slice(0, maxAllowedFavorable);
    }
  }

  return report;
}

export function composeFullMissionReport(
  telemetry: InvariantTelemetry,
  synthesis: GeneratedLunarSynthesis,
  sources: LunarSource[],
  models: LunarMissionReportData["models"],
): LunarMissionReportData {
  const latDir = telemetry.lat >= 0 ? "N" : "S";
  const latStr = `${Math.abs(telemetry.lat).toFixed(2)}° ${latDir}`;
  const lonDir = telemetry.lon >= 0 ? "E" : "W";
  const lonStr = `${Math.abs(telemetry.lon).toFixed(2)}° ${lonDir}`;

  return {
    scoreBadge: `VIABILITY SCORE: ${telemetry.viabilityScore} / 100`,
    windowBadge: `WINDOW: ${telemetry.windowDays} DAYS (${telemetry.landingDate})`,
    headline: `${telemetry.siteName} (${latStr}, ${lonStr}) — ${telemetry.meta.profile.toUpperCase()} SITE EVALUATION`,
    footerCoords: `COORDINATES: ${latStr}, ${lonStr} | EPOCH: ${telemetry.landingDate}T00:00:00Z | RUN: ${telemetry.computedAtUtc}`,
    verdict: telemetry.verdict,
    relayRequired: telemetry.relayRequired,
    demResolutionLabel: telemetry.demResolutionLabel,
    demUncertaintyNote: telemetry.demUncertaintyNote,
    computedAtUtc: telemetry.computedAtUtc,
    scoreBreakdown: telemetry.scoreBreakdown,
    siteContext: telemetry.siteContext,
    sunlightTimeline: telemetry.sunlightTimeline,
    meta: telemetry.meta,
    params: telemetry.params,
    summary: synthesis.summary,
    favorable: synthesis.favorable,
    risks: synthesis.risks,
    sources,
    models,
  };
}

export function makeFallbackReport(
  telemetry: InvariantTelemetry,
  sources: LunarSource[],
  models: LunarMissionReportData["models"],
): LunarMissionReportData {
  const n = telemetry.rawNumbers;
  const shiftSign = n.shift29dSunlightDeltaHours >= 0 ? "+" : "";
  const dteSign = n.shift29dDteDeltaPct >= 0 ? "+" : "";
  const moveSign = n.nearbyNorth350mSunlightDeltaHours >= 0 ? "+" : "";

  const latStr = `${Math.abs(telemetry.lat).toFixed(2)}° ${telemetry.lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(telemetry.lon).toFixed(2)}° ${telemetry.lon >= 0 ? "E" : "W"}`;

  const eclipseTruncated = n.maxEclipseHours >= n.totalWindowHours;
  const blackoutTruncated = n.maxBlackoutHours >= n.totalWindowHours;
  const eclipseDisplay = `${eclipseTruncated ? "≥ " : ""}${n.maxEclipseHours} hrs`;
  const blackoutDisplay = `${blackoutTruncated ? "≥ " : ""}${n.maxBlackoutHours} hrs`;

  const failedReasons: string[] = [];
  if (n.slopeDeg > n.noGoSlopeDeg) {
    failedReasons.push(
      `a ${n.slopeDeg}° slope exceeding the ${n.noGoSlopeDeg}° hard tilt limit`,
    );
  } else if (n.slopeDeg > n.maxSlopeLimitDeg) {
    failedReasons.push(
      `a marginal ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°) slope above the ${n.maxSlopeLimitDeg}° nominal limit`,
    );
  }
  if (telemetry.isInsidePsr || n.sunlightPct < n.noGoSunPct) {
    failedReasons.push(
      telemetry.isInsidePsr
        ? "permanent crater shadow (0% sunlight)"
        : `${n.sunlightPct}% sunlight (below ${n.noGoSunPct}% minimum) and ${eclipseDisplay} max eclipse vs ${n.maxEclipseSafeHrs} hr battery limit`,
    );
  } else if (n.sunlightPct < n.targetSunPct || n.maxEclipseHours > n.maxEclipseSafeHrs) {
    failedReasons.push(
      `${n.sunlightPct}% sunlight (target ≥ ${n.targetSunPct}%) with ${eclipseDisplay} max continuous eclipse vs ${n.maxEclipseSafeHrs} hr battery survival limit`,
    );
  }
  if (n.dteUptimePct < n.noGoDtePct) {
    failedReasons.push(
      `${n.dteUptimePct}% Direct-to-Earth visibility (below ${n.noGoDtePct}% minimum)`,
    );
  }

  const verdictDriver =
    failedReasons.length > 0
      ? `driven by ${failedReasons.join(" and ")}`
      : `supported by a ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°) surface slope within the ${n.maxSlopeLimitDeg}° ${telemetry.meta.profile} tilt limit`;

  const solarAssessment = telemetry.isInsidePsr
    ? `Located inside a Permanently Shadowed Region with ${n.minHorizonDeg}° minimum surrounding rim elevation blocking the ${n.peakSolarElevDeg}° peak Sun, resulting in 0 hrs (0%) of direct sunlight across all ${n.totalWindowHours} hrs`
    : `With ${n.horizonBlockDeg}° peak horizon obstruction and a ${n.peakSolarElevDeg}° peak Sun angle, solar arrays receive ${n.sunlightHours} hrs (${n.sunlightPct}% ±${n.sunlightUncertaintyPct}%) of illumination, while maximum continuous eclipse is ${eclipseDisplay} (${n.maxEclipseHours <= n.maxEclipseSafeHrs ? "within" : "exceeding"} the ${n.maxEclipseSafeHrs} hr battery survival limit)`;

  const commsAssessment = telemetry.relayRequired
    ? `Direct-to-Earth visibility is ${n.dteUptimePct}% with a ${blackoutDisplay} continuous blackout (exceeding the ${n.maxBlackoutLimitHrs} hr autonomous buffer), so an orbital relay satellite is required`
    : `Direct-to-Earth radio visibility holds for ${n.dteUptimePct}% of the window with a maximum blackout of ${blackoutDisplay} (within the ${n.maxBlackoutLimitHrs} hr autonomous buffer), requiring no orbital relay`;

  const favorable: GeneratedLunarSynthesis["favorable"] = [];

  if (n.slopeDeg <= n.safeSlopeDeg) {
    favorable.push({
      title: "Safe Touchdown Slope",
      body: `Measured baseline tilt is ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°), providing ${(n.maxSlopeLimitDeg - n.slopeDeg).toFixed(1)}° margin below the ${n.maxSlopeLimitDeg}° ${telemetry.meta.profile} limit.`,
      tag: "LOLA DEM",
      sourceIds: ["source-1"],
    });
  }

  if (n.sunlightPct >= n.targetSunPct && n.maxEclipseHours <= n.maxEclipseSafeHrs) {
    favorable.push({
      title: "Sustained Solar Illumination",
      body: `Receives ${n.sunlightHours} hrs (${n.sunlightPct}%) of sunlight with max continuous shadow of ${n.maxEclipseHours} hrs (within the ${n.maxEclipseSafeHrs} hr ${telemetry.meta.profile} battery limit).`,
      tag: "JPL HORIZONS",
      sourceIds: ["source-2"],
    });
  }

  if (!telemetry.relayRequired && n.dteUptimePct >= n.targetDtePct) {
    favorable.push({
      title: "Reliable Direct-to-Earth Link",
      body: `Maintains ${n.dteUptimePct}% Direct-to-Earth visibility with max blackout of ${n.maxBlackoutHours} hrs (within ${n.maxBlackoutLimitHrs} hr autonomous limit; no orbital relay needed).`,
      tag: "SKYFIELD",
      sourceIds: ["source-2", "source-3"],
    });
  }

  if (favorable.length < 3 && !telemetry.isInsidePsr && n.psrDistKm <= 8.0) {
    favorable.push({
      title: "Close Traverse to Polar PSR Ice",
      body: `Positioned ${n.psrDistKm} km from mapped Permanently Shadowed Regions, enabling short-range volatile prospecting from an illuminated landing zone.`,
      tag: "LOLA DEM",
      sourceIds: ["source-1", "source-3"],
    });
  }

  const risks: GeneratedLunarSynthesis["risks"] = [];

  if (n.slopeDeg > n.maxSlopeLimitDeg) {
    const delta = (n.slopeDeg - n.maxSlopeLimitDeg).toFixed(1);
    const isMarginal = n.slopeDeg <= n.maxSlopeLimitDeg + n.slopeUncertaintyDeg;
    risks.push({
      title: isMarginal
        ? `Marginal Terrain Slope (${n.slopeDeg}° vs ${n.maxSlopeLimitDeg}° Limit)`
        : `Excessive Terrain Slope (${n.slopeDeg}° > ${n.maxSlopeLimitDeg}°)`,
      body: isMarginal
        ? `Local grade of ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°) exceeds the ${n.maxSlopeLimitDeg}° ${telemetry.meta.profile} limit by ${delta}°, within DEM measurement uncertainty.`
        : `Local grade of ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°) exceeds the ${n.maxSlopeLimitDeg}° ${telemetry.meta.profile} stability threshold by ${delta}°, creating tip-over risk.`,
      sourceIds: ["source-1", "source-3"],
    });
  } else if (n.slopeDeg > n.safeSlopeDeg) {
    risks.push({
      title: `Tight Slope Margin (${n.slopeDeg}° / ${n.maxSlopeLimitDeg}° Limit)`,
      body: `Local grade of ${n.slopeDeg}° (±${n.slopeUncertaintyDeg}°) leaves only ${(n.maxSlopeLimitDeg - n.slopeDeg).toFixed(1)}° margin under the ${n.maxSlopeLimitDeg}° ${telemetry.meta.profile} tilt limit.`,
      sourceIds: ["source-1", "source-3"],
    });
  }

  if (telemetry.isInsidePsr || n.maxEclipseHours > n.maxEclipseSafeHrs) {
    risks.push({
      title: telemetry.isInsidePsr
        ? "Permanent Shadow & Cryogenic Thermal Sink"
        : `Extended Eclipse (${eclipseDisplay} > ${n.maxEclipseSafeHrs}h Limit)`,
      body: telemetry.isInsidePsr
        ? `Surrounding crater walls (${n.minHorizonDeg}°–${n.horizonBlockDeg}°) block the ${n.peakSolarElevDeg}° Sun continuously (${eclipseDisplay} darkness), eliminating solar power generation.`
        : `Continuous darkness reaches ${eclipseDisplay}, exceeding the ${n.maxEclipseSafeHrs} hr ${telemetry.meta.profile} battery survival limit.`,
      sourceIds: ["source-1", "source-3"],
    });
  } else if (n.peakSolarElevDeg <= 3.0) {
    risks.push({
      title: "Grazing Solar Incidence & Sub-Pixel Hazards",
      body: `Sun peaks at ${n.peakSolarElevDeg}° above the horizon (requiring vertical solar panels), while ${telemetry.demResolutionLabel} cannot resolve meter-scale boulders.`,
      sourceIds: ["source-1", "source-2"],
    });
  }

  if (telemetry.relayRequired) {
    risks.push({
      title: `Relay Required (Blackout ${blackoutDisplay} > ${n.maxBlackoutLimitHrs}h)`,
      body: `Earth is occulted for ${blackoutDisplay} (${n.dteUptimePct}% DTE), exceeding the ${n.maxBlackoutLimitHrs} hr ${telemetry.meta.profile} autonomous communication limit.`,
      sourceIds: ["source-2", "source-3"],
    });
  }

  if (risks.length < 3) {
    risks.push({
      title: "Launch Slip (+29.5 Days) & 350m Offset",
      body: `Delaying landing by one synodic month changes sunlight by ${shiftSign}${n.shift29dSunlightDeltaHours} hrs (${dteSign}${n.shift29dDteDeltaPct}% DTE). Shifting 350 m North alters illumination by ${moveSign}${n.nearbyNorth350mSunlightDeltaHours} hrs.`,
      sourceIds: ["source-1", "source-2"],
    });
  }

  if (risks.length < 3) {
    risks.push({
      title: "Sub-Pixel Boulder & Crater Roughness",
      body: `${telemetry.demResolutionLabel} elevation grid (±${n.elevationUncertaintyM} m vertical error) does not resolve hazards smaller than pixel scale; terminal hazard avoidance is required.`,
      sourceIds: ["source-1", "source-3"],
    });
  }

  const fallbackSynthesis: GeneratedLunarSynthesis = {
    summary: `The ${telemetry.siteName} sector (${latStr}, ${lonStr}) at ${n.elevationM.toLocaleString("en-US")} m (±${n.elevationUncertaintyM} m) receives a ${telemetry.verdict} verdict for ${telemetry.meta.profile}, ${verdictDriver}. ${solarAssessment}. ${commsAssessment}, located ${n.psrDistKm} km from mapped PSR water-ice cold traps.`,
    favorable: favorable.slice(0, 3),
    risks: risks.slice(0, 3),
  };

  return composeFullMissionReport(telemetry, fallbackSynthesis, sources, models);
}

export const reportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "favorable", "risks"],
  properties: {
    summary: { type: "string" },
    favorable: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body", "tag", "sourceIds"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          tag: {
            type: "string",
            enum: ["LOLA DEM", "JPL HORIZONS", "SKYFIELD", "MISSION SPECS"],
          },
          sourceIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    },
    risks: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body", "sourceIds"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          sourceIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;