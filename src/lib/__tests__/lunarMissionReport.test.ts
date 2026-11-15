import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/mission-report/route";
import {
  composeFullMissionReport,
  makeFallbackReport,
  MISSION_PROFILES,
  validateGeneratedReport,
} from "../lunarMissionReport";
import { extractLunarTelemetryAndSources } from "../lunarTelemetryExtractor";

// Deterministically disable external network calls in unit tests
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  })),
);

describe("Lunar Global DSS (LDEM_64 + CLPS Lander) — Full 24-Test Suite", () => {

  it("01. Apollo 11 (0.67° N, 23.47° E): Mare Tranquillitatis detection, N hemisphere & smooth mare slope", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-18",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.siteName).toContain("APOLLO 11");
    expect(report.headline).toContain("0.67° N, 23.47° E");
    expect(telemetry.isInsidePsr).toBe(false);
    expect(telemetry.rawNumbers.elevationM).toBeLessThan(0);
    expect(telemetry.rawNumbers.slopeDeg).toBeLessThanOrEqual(MISSION_PROFILES.clps.maxSlopeDeg);
    expect(telemetry.rawNumbers.dteUptimePct).toBeGreaterThanOrEqual(95);
    expect(telemetry.relayRequired).toBe(false);
  });

  it("02. Apollo 17 (20.19° N, 30.77° E): Taurus-Littrow Valley recognition and northern hemisphere formatting", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: 20.19,
      lon: 30.77,
      landingDate: "2026-11-18",
      windowDays: 7,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.siteName).toContain("TAURUS-LITTROW");
    expect(report.headline).toContain("20.19° N, 30.77° E");
    expect(telemetry.siteContext?.badge).toContain("APOLLO 17");
  });

  it("03. Chang'e-4 Farside (-45.45° S, 177.58° E): Von Kármán Crater requires orbital relay (0% DTE)", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -45.45,
      lon: 177.58,
      landingDate: "2026-11-05",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.siteName).toContain("VON KÁRMÁN");
    expect(report.headline).toContain("45.45° S, 177.58° E");
    expect(telemetry.rawNumbers.dteUptimePct).toBe(0);
    expect(telemetry.relayRequired).toBe(true);
    expect(report.verdict).toBe("NO-GO");
  });

  it("04. North Pole Region — Peary Crater (88.60° N, 33.00° E): northern polar coordinates & grazing sun", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: 88.6,
      lon: 33.0,
      landingDate: "2026-11-15",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.siteName).toContain("PEARY CRATER");
    expect(report.headline).toContain("88.60° N, 33.00° E");
    expect(telemetry.rawNumbers.peakSolarElevDeg).toBeLessThan(5.0);
  });

  it("05. Arbitrary Equatorial Point (0.00° N, -45.00° W): dynamic non-polar naming without South Pole artifacts", async () => {
    const { telemetry } = await extractLunarTelemetryAndSources({
      lat: 0.0,
      lon: -45.0,
      landingDate: "2026-11-20",
      windowDays: 7,
    });

    expect(telemetry.siteName).toContain("NEARSIDE EQUATORIAL");
    expect(telemetry.siteName).not.toContain("SOUTH POLAR");
    expect(telemetry.siteName).toContain("KM FROM");
  });

  it("06. Arbitrary Farside Mid-Latitude Point (35.00° N, -150.00° W): farside relay detection & labeling", async () => {
    const { telemetry } = await extractLunarTelemetryAndSources({
      lat: 35.0,
      lon: -150.0,
      landingDate: "2026-11-15",
      windowDays: 14,
    });

    expect(telemetry.siteName).toContain("FARSIDE MID-LATITUDE");
    expect(telemetry.relayRequired).toBe(true);
    expect(telemetry.rawNumbers.dteUptimePct).toBe(0);
  });

  //  Astronomy, moon phases and spherical geometry

  it("07. Equatorial vs Polar Solar Zenith Angle: Sun rises >80° at equator vs <5° at poles", async () => {
    const equator = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-15",
      windowDays: 30,
    });

    const southPole = await extractLunarTelemetryAndSources({
      lat: -89.45,
      lon: -137.3,
      landingDate: "2026-11-15",
      windowDays: 30,
    });

    expect(equator.telemetry.rawNumbers.peakSolarElevDeg).toBeGreaterThan(80.0);
    expect(southPole.telemetry.rawNumbers.peakSolarElevDeg).toBeLessThan(5.0);
  });

  it("08. Full Moon Alignment (2026-11-24): nearside 0°E is sunlit while farside 180°E is midnight", async () => {
    const nearside = await extractLunarTelemetryAndSources({
      lat: -83.5,
      lon: 0.0,
      landingDate: "2026-11-24",
      windowDays: 7,
    });

    const farside = await extractLunarTelemetryAndSources({
      lat: -83.5,
      lon: 180.0,
      landingDate: "2026-11-24",
      windowDays: 7,
    });

    expect(nearside.telemetry.rawNumbers.peakSolarElevDeg).toBeGreaterThan(5.0);
    expect(farside.telemetry.rawNumbers.peakSolarElevDeg).toBeLessThan(1.5);
    expect(nearside.telemetry.rawNumbers.sunlightPct).toBeGreaterThan(
      farside.telemetry.rawNumbers.sunlightPct,
    );
  });

  it("09. New Moon Alignment (2026-11-09): farside 180°E is sunlit while nearside 0°E is midnight", async () => {
    const nearside = await extractLunarTelemetryAndSources({
      lat: -83.5,
      lon: 0.0,
      landingDate: "2026-11-09",
      windowDays: 7,
    });

    const farside = await extractLunarTelemetryAndSources({
      lat: -83.5,
      lon: 180.0,
      landingDate: "2026-11-09",
      windowDays: 7,
    });

    expect(farside.telemetry.rawNumbers.peakSolarElevDeg).toBeGreaterThan(5.0);
    expect(farside.telemetry.rawNumbers.sunlightPct).toBeGreaterThan(
      nearside.telemetry.rawNumbers.sunlightPct,
    );
  });

  it("10. Equatorial Synodic Day/Night Cycle (30D window): ~50% sunlight and ~14-day lunar night", async () => {
    const eq30d = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-15",
      windowDays: 30,
    });

    // Full synodic month 29.53 days: ~354 hours of daylight and ~354 hours of night
    expect(eq30d.telemetry.rawNumbers.sunlightPct).toBeGreaterThan(42);
    expect(eq30d.telemetry.rawNumbers.sunlightPct).toBeLessThan(58);
    expect(eq30d.telemetry.rawNumbers.maxEclipseHours).toBeGreaterThan(300);
    // During the night, the CLPS battery (36h) discharges, so 30D at the equator without RTG gives CONDITIONAL
    expect(eq30d.telemetry.verdict).toBe("CONDITIONAL");
  });

  it("11. South Pole Geometric Singularity (-90.00° S): identical topography across longitudes", async () => {
    const pole0 = await extractLunarTelemetryAndSources({
      lat: -90.0,
      lon: 0.0,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    const pole90 = await extractLunarTelemetryAndSources({
      lat: -90.0,
      lon: 90.0,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    expect(pole0.telemetry.rawNumbers.elevationM).toBe(pole90.telemetry.rawNumbers.elevationM);
    expect(pole0.telemetry.rawNumbers.slopeDeg).toBe(pole90.telemetry.rawNumbers.slopeDeg);
    expect(pole0.telemetry.rawNumbers.psrDistKm).toBe(pole90.telemetry.rawNumbers.psrDistKm);
  });

  it("12. North Pole Geometric Singularity (+90.00° N): identical elevation across longitudes", async () => {
    const north0 = await extractLunarTelemetryAndSources({
      lat: 90.0,
      lon: 0.0,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    const north120 = await extractLunarTelemetryAndSources({
      lat: 90.0,
      lon: 120.0,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    expect(north0.telemetry.rawNumbers.elevationM).toBe(north120.telemetry.rawNumbers.elevationM);
    expect(north0.telemetry.rawNumbers.psrDistKm).toBe(0);
  });

  //  POLAR REFERENCES AND CLPS LANDER SPECIFICATIONS 

  it("13. Single Profile Enforcement: always uses CLPS Lander limits (8° tilt, 36h eclipse, 24h blackout)", async () => {
    const { telemetry } = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-18",
      windowDays: 14,
      profile: "hls", // Even when passing the old key, the system enforces CLPS
    });

    expect(telemetry.profileId).toBe("clps");
    expect(telemetry.meta.profile).toBe("CLPS Lander");
    expect(telemetry.rawNumbers.maxSlopeLimitDeg).toBe(8.0);
    expect(telemetry.rawNumbers.maxEclipseSafeHrs).toBe(36);
    expect(telemetry.rawNumbers.maxBlackoutLimitHrs).toBe(24);
  });

  it("14. Shackleton–de Gerlache Ridge (-89.45°, -137.30°): achieves GO for CLPS Lander", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -89.45,
      lon: -137.3,
      landingDate: "2026-11-15",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.rawNumbers.slopeDeg).toBeLessThanOrEqual(8.0);
    expect(telemetry.rawNumbers.sunlightPct).toBeGreaterThanOrEqual(75);
    expect(["GO", "CONDITIONAL"]).toContain(report.verdict);
    expect(report.params.horizon).toContain("(Min ");
  });

  it("15. Shackleton Crater Floor (-89.67°, 129.78°): Inside PSR, 0% sun, NO-GO & '≥' eclipse truncation", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -89.67,
      lon: 129.78,
      landingDate: "2026-11-15",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(telemetry.isInsidePsr).toBe(true);
    expect(telemetry.rawNumbers.sunlightHours).toBe(0);
    expect(telemetry.rawNumbers.maxEclipseHours).toBe(336);
    expect(report.verdict).toBe("NO-GO");
    expect(report.params.eclipse).toBe("≥ 336 hrs");
    expect(report.summary).toContain("≥ 336 hrs");
  });

  it("16. Longitude Sign Sensitivity: +129.78° E (Shackleton PSR) vs -129.78° W", async () => {
    const east = await extractLunarTelemetryAndSources({
      lat: -89.67,
      lon: 129.78,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    const west = await extractLunarTelemetryAndSources({
      lat: -89.67,
      lon: -129.78,
      landingDate: "2026-11-15",
      windowDays: 7,
    });

    expect(east.telemetry.isInsidePsr).toBe(true);
    expect(west.telemetry.isInsidePsr).toBe(false);
    expect(west.telemetry.rawNumbers.psrDistKm).toBeGreaterThan(0);
  });

  it("17. Sunlight Timeline Conservation: sum of timeline equals sunlightHours across 7D/14D/21D/30D", async () => {
    for (const windowDays of [7, 14, 21, 30]) {
      const { telemetry } = await extractLunarTelemetryAndSources({
        lat: 0.67,
        lon: 23.47,
        landingDate: "2026-11-15",
        windowDays,
      });

      const totalHours = windowDays * 24;
      const litSum = telemetry.sunlightTimeline.reduce((acc, v) => acc + v, 0);

      expect(telemetry.sunlightTimeline.length).toBe(totalHours);
      expect(litSum).toBe(telemetry.rawNumbers.sunlightHours);
    }
  });

  // VALIDATION 

  it("18. Favorable Factors Discipline: never pads 'favorable' when all criteria fail", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -89.54,
      lon: 129.78,
      landingDate: "2026-11-24",
      windowDays: 14,
    });

    const report = makeFallbackReport(telemetry, sources, {
      extraction: "test",
      synthesis: "fallback",
    });

    expect(report.favorable.length).toBe(0);
    expect(report.risks.length).toBeGreaterThanOrEqual(2);
  });

  it("19. Validator rejects hallucinated numbers and leaked camelCase code identifiers", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-18",
      windowDays: 7,
    });

    expect(() =>
      validateGeneratedReport(
        {
          summary: "Site is at 9999 meters with 100% sunlight.",
          favorable: [],
          risks: [{ title: "Test", body: "Risk.", sourceIds: ["source-1"] }],
        },
        sources,
        telemetry,
      ),
    ).toThrow(/REPORT_HALLUCINATED_NUMBER/);

    expect(() =>
      validateGeneratedReport(
        {
          summary: "The maxSlopeLimitDeg is 8.",
          favorable: [],
          risks: [{ title: "Test", body: "Risk.", sourceIds: ["source-1"] }],
        },
        sources,
        telemetry,
      ),
    ).toThrow(/REPORT_LEAKED_VARIABLE_NAME/);
  });

  it("20. Validator catches LLM confusing 'sunlight hours' with '36-hour battery eclipse limit'", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: 0.67,
      lon: 23.47,
      landingDate: "2026-11-18",
      windowDays: 7,
    });

    const n = telemetry.rawNumbers;

    expect(() =>
      validateGeneratedReport(
        {
          summary: `Site receives ${n.sunlightHours} hours of sunlight, far below the 36-hour battery survival limit.`,
          favorable: [],
          risks: [{ title: "Eclipse", body: "Shadow.", sourceIds: ["source-2"] }],
        },
        sources,
        telemetry,
      ),
    ).toThrow(/REPORT_CONFUSED_SUNLIGHT_WITH_ECLIPSE_LIMIT/);
  });

  it("21. Validator strips false 'favorable' cards when criteria actually failed", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -45.45,
      lon: 177.58,
      landingDate: "2026-11-05",
      windowDays: 14,
    });

    const n = telemetry.rawNumbers;
    const cleaned = validateGeneratedReport(
      {
        summary: `At ${n.elevationM} m with ${n.slopeDeg}° slope, ${n.sunlightHours} hrs sunlight, and ${n.dteUptimePct}% DTE uptime, an orbital relay is required.`,
        favorable: [
          {
            title: "Reliable Direct-to-Earth Link",
            body: "Great communications.",
            tag: "JPL HORIZONS",
            sourceIds: ["source-2"],
          },
          {
            title: "Close PSR Ice Access",
            body: "Near ice.",
            tag: "LOLA DEM",
            sourceIds: ["source-1"],
          },
        ],
        risks: [
          {
            title: "Farside Blackout",
            body: "0% DTE uptime.",
            sourceIds: ["source-2"],
          },
        ],
      },
      sources,
      telemetry,
    );

    expect(cleaned.favorable.length).toBe(0);
  });

  it("22. Validator catches Relay Required contradiction in LLM summary", async () => {
    const { telemetry, sources } = await extractLunarTelemetryAndSources({
      lat: -45.45,
      lon: 177.58,
      landingDate: "2026-11-05",
      windowDays: 14,
    });

    const n = telemetry.rawNumbers;
    expect(telemetry.relayRequired).toBe(true);

    expect(() =>
      validateGeneratedReport(
        {
          summary: `Site at ${n.elevationM} m has ${n.dteUptimePct}% DTE uptime and requires no orbital relay.`,
          favorable: [],
          risks: [{ title: "Risk", body: "None", sourceIds: ["source-1"] }],
        },
        sources,
        telemetry,
      ),
    ).toThrow(/REPORT_CONTRADICTS_RELAY_RULE/);
  });

  it("23. Fallback Self-Validation & Composition across 7 diverse global lunar sites", async () => {
    const globalSites = [
      { lat: 0.67, lon: 23.47 },     // Apollo 11 (Equator Nearside)
      { lat: 20.19, lon: 30.77 },    // Apollo 17 (Northern Mid-Lat)
      { lat: -45.45, lon: 177.58 },  // Chang'e-4 (Southern Farside)
      { lat: 88.6, lon: 33.0 },      // Peary Crater (North Pole)
      { lat: -89.67, lon: 129.78 },  // Shackleton Floor (South Pole PSR)
      { lat: -89.45, lon: -137.3 },  // Shackleton Ridge (South Pole GO)
      { lat: 15.0, lon: -120.0 },    // Arbitrary Farside Point
    ];

    for (const site of globalSites) {
      const { telemetry, sources } = await extractLunarTelemetryAndSources({
        lat: site.lat,
        lon: site.lon,
        landingDate: "2026-11-18",
        windowDays: 14,
      });

      const fallback = makeFallbackReport(telemetry, sources, {
        extraction: "test",
        synthesis: "fallback",
      });

      expect(() =>
        validateGeneratedReport(
          {
            summary: fallback.summary,
            favorable: fallback.favorable,
            risks: fallback.risks,
          },
          sources,
          telemetry,
        ),
      ).not.toThrow();

      const composed = composeFullMissionReport(
        telemetry,
        {
          summary: fallback.summary,
          favorable: fallback.favorable,
          risks: fallback.risks,
        },
        sources,
        { extraction: "test", synthesis: "fallback" },
      );

      expect(composed.meta.profile).toBe("CLPS Lander");
      expect(composed.headline).toContain(site.lat >= 0 ? "° N" : "° S");
    }
  });

  // INTEGRATION TEST API ROUTE 

  it("24. API Route Handler (POST /api/mission-report): accepts global [-90..90] & rejects out-of-bounds", async () => {
    // 1. Outside the Moon's range (-95°) -> 400
    const invalidReq = new NextRequest("http://localhost:3000/api/mission-report", {
      method: "POST",
      body: JSON.stringify({ lat: -95.0, lon: 0.0 }),
    });
    const invalidRes = await POST(invalidReq);
    expect(invalidRes.status).toBe(400);

    // 2. "Equator" (Apollo 11) -> 200 OK
    const eqReq = new NextRequest("http://localhost:3000/api/mission-report", {
      method: "POST",
      body: JSON.stringify({
        lat: 0.67,
        lon: 23.47,
        landingDate: "2026-11-18",
        windowDays: 14,
      }),
    });
    const eqRes = await POST(eqReq);
    expect(eqRes.status).toBe(200);
    const eqPayload = await eqRes.json();
    expect(eqPayload.report.headline).toContain("APOLLO 11");
    expect(eqPayload.report.meta.profile).toBe("CLPS Lander");

    // 3. Average latitude of the far side (Chang'e-4) -> 200 OK
    const farsideReq = new NextRequest("http://localhost:3000/api/mission-report", {
      method: "POST",
      body: JSON.stringify({
        lat: -45.45,
        lon: 177.58,
        landingDate: "2026-11-05",
        windowDays: 7,
      }),
    });
    const farsideRes = await POST(farsideReq);
    expect(farsideRes.status).toBe(200);
    const farsidePayload = await farsideRes.json();
    expect(farsidePayload.report.sunlightTimeline.length).toBe(168);
  });
});