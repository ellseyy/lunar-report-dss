"use client";

import React, { useEffect, useState } from "react";
import type { LunarMissionReportData } from "@/lib/lunarMissionReport";

interface LunarMissionReportProps {
  report: LunarMissionReportData;
  isLoading?: boolean;
  isStale?: boolean;
}

export function LunarMissionReport({
  report,
  isLoading = false,
  isStale = false,
}: LunarMissionReportProps) {
  const [activeTab, setActiveTab] = useState<"favorable" | "risks">(() =>
    report.favorable.length === 0 ? "risks" : "favorable",
  );
  const [typedSummary, setTypedSummary] = useState<string>(report.summary);

  useEffect(() => {
    setActiveTab(report.favorable.length === 0 ? "risks" : "favorable");
  }, [report]);

  useEffect(() => {
    if (isLoading) {
      setTypedSummary("");
      return;
    }

    const fullText = report.summary || "";
    if (!fullText) {
      setTypedSummary("");
      return;
    }

    let idx = 0;
    const step = Math.max(2, Math.ceil(fullText.length / 45));
    const timer = setInterval(() => {
      idx += step;
      if (idx >= fullText.length) {
        setTypedSummary(fullText);
        clearInterval(timer);
      } else {
        setTypedSummary(fullText.slice(0, idx));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [report.summary, isLoading]);

  const totalHours = report.sunlightTimeline.length || 336;
  const midHours = Math.round(totalHours / 2);

  const latMatch = report.headline.match(/(\d+(?:\.\d+)?)°\s*([NS])/i);
  const absLat = latMatch ? parseFloat(latMatch[1]) : 85;
  const isPolarRegion = absLat >= 75;

  const coordsMatch = report.headline.match(
    /(\d+(?:\.\d+)?)°\s*([NS]),\s*(\d+(?:\.\d+)?)°\s*([EW])/i,
  );
  const coordsDisplay = coordsMatch
    ? `${coordsMatch[1]}° ${coordsMatch[2].toUpperCase()}, ${coordsMatch[3]}° ${coordsMatch[4].toUpperCase()}`
    : "GLOBAL LUNAR SURFACE";

  const dateMatch = report.meta.window.match(/\((\d{4}-\d{2}-\d{2})\)/);
  const epochDate = dateMatch ? dateMatch[1] : "2026-11-15";

  return (
    <article
      className={`w-full max-w-[680px] font-sans antialiased text-white transition-opacity duration-200 ${
        isStale ? "opacity-80" : "opacity-100"
      }`}
    >
      {/* TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] uppercase tracking-widest text-neutral-400 tabular-nums">
        <span>LUNAR GLOBAL DEM + DE440 EPHEMERIS</span>
        <span>COMPUTED: {report.computedAtUtc}</span>
      </div>

      {/* MAIN REPORT FRAME */}
      <div className="border border-white bg-[#050505]">
        {/* HEADER */}
        <header className="p-5 sm:p-6 border-b border-white">
          <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-widest tabular-nums">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-white bg-[#0C0C0C] text-white">
              <span>&#9737;</span>
              <span>MODEL-BACKED REPORT</span>
            </span>
            <span className="px-2 py-0.5 border border-white/60 bg-[#0C0C0C] text-neutral-200 uppercase">
              WINDOW: {report.meta.window}
            </span>
            {isStale && (
              <span className="px-2 py-0.5 border border-amber-300 bg-amber-300/15 text-amber-200">
                OUTDATED PREVIEW — REGENERATE
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight leading-snug text-white">
            {report.headline}
          </h1>
        </header>

        {/* VERDICT & MISSION METADATA */}
        <section className="grid grid-cols-1 sm:grid-cols-12 border-b border-white">
          <div className="sm:col-span-5 p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-white flex flex-col justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
              MISSION VERDICT
            </span>
            <div>
              <span className="inline-block px-4 py-1.5 border-2 border-white bg-[#0C0C0C] text-2xl sm:text-[26px] font-black uppercase tracking-wider text-white">
                {report.verdict}
              </span>
            </div>
          </div>

          <div className="sm:col-span-7 p-5 sm:p-6 flex flex-col justify-center space-y-2 text-xs tabular-nums">
            <div className="flex items-center justify-between gap-4">
              <span className="uppercase tracking-widest text-neutral-400 text-[10px]">
                PROFILE:
              </span>
              <span className="font-bold text-white">{report.meta.profile}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="uppercase tracking-widest text-neutral-400 text-[10px]">
                WINDOW:
              </span>
              <span className="font-bold text-white">{report.meta.window}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="uppercase tracking-widest text-neutral-400 text-[10px]">
                RELAY REQUIRED:
              </span>
              <span className="font-bold text-white">{report.meta.relay}</span>
            </div>
          </div>
        </section>

        {/* MISSION OVERVIEW */}
        <section className="p-5 sm:p-6 border-b border-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">
              MISSION OVERVIEW
            </span>
            <span className="px-2 py-0.5 border border-white/50 bg-[#0C0C0C] text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
              SYNTHESIS
            </span>
          </div>

          <p className="text-[13.5px] leading-relaxed text-neutral-100">
            {typedSummary}
          </p>
        </section>

        {/* DAY / NIGHT SOLAR RHYTHM */}
        <section className="p-5 sm:p-6 border-b border-white">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 text-[10px] font-semibold uppercase tracking-widest tabular-nums">
            <span className="text-neutral-300">DAY / NIGHT SOLAR RHYTHM</span>
            <div className="flex items-center gap-4 text-neutral-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-white" />
                <span>SUNLIT</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 border border-white/70 bg-[#050505]" />
                <span>SHADOW</span>
              </span>
            </div>
          </div>

          <div
            className="w-full h-3 border border-white bg-[#050505] flex overflow-hidden"
            aria-label="Hourly solar illumination timeline"
          >
            {report.sunlightTimeline.map((lit, idx) => (
              <div
                key={idx}
                className={lit === 1 ? "flex-1 h-full bg-white" : "flex-1 h-full bg-[#050505]"}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[10px] uppercase tracking-wider text-neutral-400 tabular-nums">
            <span>0H (LANDING)</span>
            <span>+{midHours}H</span>
            <span>+{totalHours}H</span>
          </div>
        </section>

        {/* INVARIANT TECHNICAL PARAMETERS */}
        <section className="border-b border-white">
          <div className="px-5 sm:px-6 py-3.5 border-b border-white/40">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white">
              INVARIANT TECHNICAL PARAMETERS
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400 tabular-nums">
              {report.demUncertaintyNote}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/40">
            {/* COLUMN 1 */}
            <div className="p-5 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white pb-2 border-b border-white/30">
                1. TOPOGRAPHY &amp; HORIZ
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  SLOPE
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.slope}{" "}
                  <span className="text-[11px] font-normal text-neutral-300">
                    {report.params.slopeNote}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  ELEVATION
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.elevation}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  HORIZON BLOCK
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.horizon}
                </div>
              </div>
            </div>

            {/* COLUMN 2 */}
            <div className="p-5 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white pb-2 border-b border-white/30">
                2. SOLAR &amp; POWER
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  TOTAL SUNLIGHT
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.sunlight}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  PEAK SUN ELEV
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.peakElev}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  MAX ECLIPSE
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.eclipse}
                </div>
              </div>
            </div>

            {/* COLUMN 3 */}
            <div className="p-5 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white pb-2 border-b border-white/30">
                3. COMMS &amp; SCIENCE
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  DTE UPTIME
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.dte}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  MAX BLACKOUT
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.blackout}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  {isPolarRegion ? "DIST TO PSR ICE" : "DIST TO NEAREST POLE"}
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {report.params.psr}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TABS: FAVORABLE FACTORS / RISKS & CONTINGENCY */}
        <section>
          <div className="grid grid-cols-2 border-b border-white text-[11px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setActiveTab("favorable")}
              className={`px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                activeTab === "favorable"
                  ? "bg-white text-[#050505]"
                  : "bg-[#050505] text-white hover:bg-white/10"
              }`}
            >
              <span>+ FAVORABLE FACTORS ({report.favorable.length})</span>
              <span
                className={`text-[9px] tracking-widest ${
                  activeTab === "favorable" ? "text-neutral-700" : "text-neutral-400"
                }`}
              >
                SUPPORT
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("risks")}
              className={`px-4 py-3 flex items-center justify-between gap-2 text-left border-l border-white transition-colors cursor-pointer ${
                activeTab === "risks"
                  ? "bg-white text-[#050505]"
                  : "bg-[#050505] text-white hover:bg-white/10"
              }`}
            >
              <span>&#9888; RISKS &amp; CONTINGENCY ({report.risks.length})</span>
              <span
                className={`text-[9px] tracking-widest ${
                  activeTab === "risks" ? "text-neutral-700" : "text-neutral-400"
                }`}
              >
                CONSTRAINTS
              </span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {activeTab === "favorable" ? (
              report.favorable.length > 0 ? (
                report.favorable.map((item, idx) => (
                  <div key={idx} className="pl-3.5 border-l-2 border-white space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                        {item.title}
                      </h3>
                      {item.tag && (
                        <span className="px-1.5 py-0.5 border border-white/60 bg-[#0C0C0C] text-[9px] font-semibold uppercase tracking-widest text-neutral-200">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-neutral-200">{item.body}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-white/30 bg-[#0C0C0C] text-xs uppercase tracking-wider text-neutral-300">
                  NO ENGINEERING PARAMETERS MET NOMINAL CLPS LANDER MARGINS FOR THIS WINDOW. REVIEW
                  RISKS &amp; CONTINGENCY TAB.
                </div>
              )
            ) : report.risks.length > 0 ? (
              report.risks.map((item, idx) => (
                <div key={idx} className="pl-3.5 border-l-2 border-white space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {item.title}
                    </h3>
                    {item.sourceIds && item.sourceIds.length > 0 && (
                      <span className="px-1.5 py-0.5 border border-white/60 bg-[#0C0C0C] text-[9px] font-semibold uppercase tracking-widest text-neutral-200">
                        {item.sourceIds.join(" · ").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed text-neutral-200">{item.body}</p>
                </div>
              ))
            ) : (
              <div className="p-4 border border-white/30 bg-[#0C0C0C] text-xs uppercase tracking-wider text-neutral-300">
                NO CRITICAL ENGINEERING CONSTRAINTS FLAGGED FOR THIS CONFIGURATION.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-neutral-500 tabular-nums">
        <span>LUNAR GLOBAL LANDING DECISION SUPPORT SYSTEM</span>
        <span>
          COORDINATES: {coordsDisplay} | EPOCH: {epochDate}T00:00:00Z | RUN: {report.computedAtUtc}
        </span>
      </footer>
    </article>
  );
}