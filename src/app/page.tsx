"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LunarMissionReport } from "@/components/LunarMissionReport";
import type { LunarMissionReportData, VerdictLabel } from "@/lib/lunarMissionReport";
import { AsciiLunarIdle } from "@/components/AsciiLunarIdle";
import { MissionDatePicker } from "@/components/MissionDatePicker";

const QUICK_PRESETS = [
  { label: "APOLLO 11 (0.67° N, 23.47° E)", lat: "0.67", lon: "23.47" },
  { label: "APOLLO 17 (20.19° N, 30.77° E)", lat: "20.19", lon: "30.77" },
  { label: "SHACKLETON RIDGE (-89.45°, -137.30°)", lat: "-89.45", lon: "-137.30" },
  { label: "CHANG'E-4 FARSIDE (-45.45°, 177.58°)", lat: "-45.45", lon: "177.58" },
];

const WINDOW_OPTIONS = [7, 14, 21, 30] as const;

interface HistoryEntry {
  id: string;
  lat: string;
  lon: string;
  landingDate: string;
  windowDays: number;
  verdict: VerdictLabel;
}

const HISTORY_STORAGE_KEY = "lunar-global-clps-history-v1";

export default function HomePage() {
  const [lat, setLat] = useState("0.67");
  const [lon, setLon] = useState("23.47");
  const [landingDate, setLandingDate] = useState("2026-11-15");
  const [windowDays, setWindowDays] = useState<number>(14);

  const [report, setReport] = useState<LunarMissionReportData | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mobileControlsOpen, setMobileControlsOpen] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as HistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(1);
      return;
    }
    setLoadingStage(1);
    const t1 = setTimeout(() => setLoadingStage(2), 350);
    const t2 = setTimeout(() => setLoadingStage(3), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoading]);

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
            item.lat === entry.lat &&
            item.lon === entry.lon &&
            item.landingDate === entry.landingDate &&
            item.windowDays === entry.windowDays
          ),
      );
      const next = [entry, ...filtered].slice(0, 6);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const fetchMissionReport = useCallback(
    async (
      targetLat: string,
      targetLon: string,
      targetDate: string,
      targetWindow: number,
    ) => {
      setIsLoading(true);
      setIsStale(false);
      setErrorMsg(null);

      try {
        const response = await fetch("/api/mission-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: Number(targetLat),
            lon: Number(targetLon),
            landingDate: targetDate,
            windowDays: targetWindow,
          }),
        });

        const payload = await response.json();
        if (!response.ok || !payload.report) {
          throw new Error(payload.error || "FAILED_TO_GENERATE_REPORT");
        }

        const nextReport = payload.report as LunarMissionReportData;
        setReport(nextReport);
        setMobileControlsOpen(false);

        pushHistory({
          id: `${targetLat}_${targetLon}_${targetDate}_${targetWindow}`,
          lat: Number(targetLat).toFixed(2),
          lon: Number(targetLon).toFixed(2),
          landingDate: targetDate,
          windowDays: targetWindow,
          verdict: nextReport.verdict,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "UNKNOWN_ERROR");
      } finally {
        setIsLoading(false);
      }
    },
    [pushHistory],
  );

  const markParamsDirty = useCallback(() => {
    setIsStale((prev) => (report ? true : prev));
    setErrorMsg(null);
  }, [report]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchMissionReport(lat, lon, landingDate, windowDays);
  };

  const handlePreset = (presetLat: string, presetLon: string) => {
    setLat(presetLat);
    setLon(presetLon);
    markParamsDirty();
  };

  const handleGlobeDrag = useCallback(
    (nextLat: string, nextLon: string) => {
      setLat(nextLat);
      setLon(nextLon);
      markParamsDirty();
    },
    [markParamsDirty],
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white py-3 px-2.5 sm:py-6 sm:px-6 overflow-x-hidden">
      <div className="max-w-[680px] mx-auto space-y-4 sm:space-y-6">
        {/* TOP MISSION CONTROL BAR */}
        <section className="w-full border border-white bg-[#050505] p-3.5 sm:p-5">
          {/* MOBILE COMPACT SUMMARY BAR (Visible on mobile when report exists) */}
          {report && (
            <div className="flex sm:hidden items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/20 tabular-nums">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                  TARGET COORDINATES
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {Number(lat).toFixed(2)}°, {Number(lon).toFixed(2)}° · {landingDate} ({windowDays}D)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileControlsOpen((prev) => !prev)}
                className="shrink-0 h-8 px-3 border border-white bg-[#0C0C0C] text-[11px] font-bold uppercase tracking-wider text-white rounded-[2px] active:bg-white active:text-[#050505]"
              >
                {mobileControlsOpen ? "HIDE" : "EDIT"}
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`${!report || mobileControlsOpen ? "block" : "hidden sm:block"} space-y-3.5 sm:space-y-4`}
          >
            {/* ROW 1: LATITUDE, LONGITUDE, DATE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                  LATITUDE (-90°..90°)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="-90"
                  max="90"
                  required
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    markParamsDirty();
                  }}
                  className="w-full h-11 sm:h-9 px-3 sm:px-2.5 bg-[#0C0C0C] border border-white text-base sm:text-xs font-semibold tabular-nums text-white focus:outline-none rounded-[2px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                  LONGITUDE (-180°..180°)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="-180"
                  max="180"
                  required
                  value={lon}
                  onChange={(e) => {
                    setLon(e.target.value);
                    markParamsDirty();
                  }}
                  className="w-full h-11 sm:h-9 px-3 sm:px-2.5 bg-[#0C0C0C] border border-white text-base sm:text-xs font-semibold tabular-nums text-white focus:outline-none rounded-[2px]"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                  LANDING DATE (UTC)
                </label>
                <MissionDatePicker
                  value={landingDate}
                  onChange={(nextDate) => {
                    setLandingDate(nextDate);
                    markParamsDirty();
                  }}
                />
              </div>
            </div>

            {/* ROW 2: WINDOW & SUBMIT BUTTON */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
              <div className="sm:col-span-7">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                  WINDOW (CLPS LANDER)
                </span>
                <div className="grid grid-cols-4 h-11 sm:h-9 border border-white rounded-[2px] overflow-hidden tabular-nums">
                  {WINDOW_OPTIONS.map((days) => {
                    const active = windowDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setWindowDays(days);
                          markParamsDirty();
                        }}
                        className={`text-xs font-bold uppercase transition-colors border-r last:border-r-0 border-white/40 cursor-pointer ${
                          active
                            ? "bg-white text-[#050505]"
                            : "bg-[#0C0C0C] text-white hover:bg-white/10"
                        }`}
                      >
                        {days}D
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-5">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-11 sm:h-9 px-4 text-xs font-extrabold uppercase tracking-widest transition-all disabled:opacity-50 rounded-[2px] cursor-pointer ${
                    isStale
                      ? "bg-amber-300 text-[#050505] hover:bg-amber-200 ring-2 ring-amber-300/40"
                      : "bg-white text-[#050505] hover:bg-neutral-200"
                  }`}
                >
                  {isLoading ? "RUNNING..." : "GENERATE REPORT"}
                </button>
              </div>
            </div>

            {/* QUICK PRESETS (Horizontal swipe on mobile, inline wrap on desktop) */}
            <div className="pt-3 border-t border-white/20 space-y-1.5 sm:space-y-0">
              <span className="block sm:inline-block text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-400 sm:mr-2 sm:mb-1.5">
                GLOBAL LANDING SITES:
              </span>
              <div className="flex sm:inline-flex overflow-x-auto sm:flex-wrap items-center gap-2 pb-1 sm:pb-0 text-[11px] tabular-nums">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePreset(preset.lat, preset.lon)}
                    className="shrink-0 px-3 py-1.5 sm:px-2.5 sm:py-1 border border-white/45 bg-[#0C0C0C] hover:border-white active:bg-white active:text-[#050505] text-white font-semibold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HISTORY (Horizontal swipe on mobile, inline wrap on desktop) */}
            {history.length > 0 && (
              <div className="pt-2.5 border-t border-white/15 space-y-2 text-[11px] tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-500">
                    LATEST SITES:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHistory([]);
                      try {
                        window.localStorage.removeItem(HISTORY_STORAGE_KEY);
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white underline cursor-pointer py-0.5 px-1"
                  >
                    CLEAR
                  </button>
                </div>

                <div className="flex overflow-x-auto sm:flex-wrap items-center gap-2 pb-1 sm:pb-0">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLat(item.lat);
                        setLon(item.lon);
                        setLandingDate(item.landingDate);
                        setWindowDays(item.windowDays);
                        void fetchMissionReport(
                          item.lat,
                          item.lon,
                          item.landingDate,
                          item.windowDays,
                        );
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 border border-white/30 bg-[#0C0C0C] hover:border-white text-neutral-200 rounded-[2px] transition-colors cursor-pointer"
                    >
                      <span>
                        {item.lat}°, {item.lon}° · {item.landingDate} ({item.windowDays}D · CLPS)
                      </span>
                      <span className="px-1 border border-white/50 text-[9px] font-bold text-white">
                        {item.verdict}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* ERROR BANNER */}
        {errorMsg && (
          <div className="w-full p-3.5 sm:p-4 border border-white bg-[#0C0C0C] text-xs uppercase tracking-wider text-white break-words">
            ERROR: {errorMsg}
          </div>
        )}

        {/* MODEL SIMULATION PROGRESS */}
        {isLoading && (
          <div className="w-full font-sans antialiased">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-400 tabular-nums">
              <span>NASA GLOBAL LOLA LDEM_64 + DE440 EPHEMERIS</span>
              <span>COMPUTING TELEMETRY PIPELINE...</span>
            </div>

            <div className="border border-white bg-[#050505] p-3.5 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  CLPS SIMULATION ACTIVE
                </span>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 tabular-nums">
                  {Number(lat).toFixed(2)}°, {Number(lon).toFixed(2)}° · {windowDays}D
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#0C0C0C] border border-white/40 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 ease-out"
                  style={{
                    width: loadingStage === 1 ? "35%" : loadingStage === 2 ? "72%" : "92%",
                  }}
                />
              </div>

              <div className="space-y-2.5 text-[11px] sm:text-xs uppercase tracking-wider tabular-nums">
                <div className="flex items-center justify-between gap-2 text-white">
                  <span>01 · SAMPLING GLOBAL LDEM_64 ELEVATION &amp; SLOPE</span>
                  <span className="shrink-0 text-[10px] border border-white px-1.5 py-0.5 bg-[#0C0C0C]">
                    {loadingStage > 1 ? "DONE" : "ACTIVE"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between gap-2 transition-opacity duration-300 ${
                    loadingStage >= 2 ? "text-white opacity-100" : "text-neutral-500 opacity-50"
                  }`}
                >
                  <span>02 · SPHERICAL RAYCASTING &amp; DE440 EPHEMERIS</span>
                  <span className="shrink-0 text-[10px] border border-white/50 px-1.5 py-0.5 bg-[#0C0C0C]">
                    {loadingStage > 2 ? "DONE" : loadingStage === 2 ? "ACTIVE" : "QUEUED"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between gap-2 transition-opacity duration-300 ${
                    loadingStage >= 3 ? "text-white opacity-100" : "text-neutral-500 opacity-50"
                  }`}
                >
                  <span>03 · EVALUATING CLPS LANDER CONSTRAINTS</span>
                  <span className="shrink-0 text-[10px] border border-white/50 px-1.5 py-0.5 bg-[#0C0C0C]">
                    {loadingStage === 3 ? "ACTIVE" : "QUEUED"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT OUTPUT */}
        {!isLoading && report && (
          <LunarMissionReport report={report} isLoading={isLoading} isStale={isStale} />
        )}

        {/* INTERACTIVE ASCII LUNAR GLOBE */}
        {!isLoading && !report && (
          <AsciiLunarIdle
            lat={lat}
            lon={lon}
            onCoordinatesChange={handleGlobeDrag}
          />
        )}
      </div>
    </main>
  );
}