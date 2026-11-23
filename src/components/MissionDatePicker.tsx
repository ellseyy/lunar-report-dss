"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface MissionDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (nextDate: string) => void;
}

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  if (y && m && d) return { year: y, month: m - 1, day: d };
  return { year: 2026, month: 10, day: 15 };
}

function formatIsoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function getTodayUtcIso(): string {
  const now = new Date();
  return formatIsoDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function MissionDatePicker({ value, onChange }: MissionDatePickerProps) {
  const parsed = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [todayIso, setTodayIso] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTodayIso(getTodayUtcIso());
  }, []);

  useEffect(() => {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [parsed.year, parsed.month]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const calendarCells = useMemo(() => {
    const firstDayJs = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const startOffset = (firstDayJs + 6) % 7; // Mon = 0 ... Sun = 6
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const cells: Array<{
      year: number;
      month: number;
      day: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ year: y, month: m, day: prevMonthDays - i, inCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ year: viewYear, month: viewMonth, day: d, inCurrentMonth: true });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ year: y, month: m, day: d, inCurrentMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button styled identically to LATITUDE / LONGITUDE inputs */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-11 sm:h-9 px-3 sm:px-2.5 bg-[#0C0C0C] border border-white text-base sm:text-xs font-semibold tabular-nums text-white flex items-center justify-between gap-2 rounded-[2px] hover:bg-white/5 focus:outline-none cursor-pointer"
        aria-expanded={open}
        aria-label="Select landing date UTC"
      >
        <span>{value}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-white"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="12" height="11" stroke="currentColor" strokeWidth="1.4" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.4" />
          <line x1="5" y1="1.5" x2="5" y2="4" stroke="currentColor" strokeWidth="1.4" />
          <line x1="11" y1="1.5" x2="11" y2="4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {/* Monochrome telemetry calendar popover */}
      {open && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto z-50 mt-1.5 w-full sm:w-[272px] bg-[#050505] border border-white p-3 shadow-2xl tabular-nums select-none">
          {/* Month header and navigation */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/20">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-7 h-7 sm:w-6 sm:h-6 border border-white/40 bg-[#0C0C0C] hover:border-white active:bg-white active:text-[#050505] text-white text-xs font-bold flex items-center justify-center rounded-[2px] cursor-pointer"
                aria-label="Previous month"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-7 h-7 sm:w-6 sm:h-6 border border-white/40 bg-[#0C0C0C] hover:border-white active:bg-white active:text-[#050505] text-white text-xs font-bold flex items-center justify-center rounded-[2px] cursor-pointer"
                aria-label="Next month"
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const iso = formatIsoDate(cell.year, cell.month, cell.day);
              const isSelected = iso === value;
              const isToday = todayIso !== "" && iso === todayIso;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-8 sm:h-7 text-xs font-semibold rounded-[2px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#050505] font-extrabold"
                      : cell.inCurrentMonth
                        ? isToday
                          ? "bg-[#0C0C0C] text-white border border-white/60 hover:bg-white/15"
                          : "bg-[#0C0C0C] text-white hover:bg-white/15"
                        : "bg-transparent text-neutral-600 hover:text-neutral-300"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick action footer */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/20 text-[10px] font-bold uppercase tracking-widest">
            <button
              type="button"
              onClick={() => {
                onChange("2026-11-15");
                setOpen(false);
              }}
              className="text-neutral-400 hover:text-white underline cursor-pointer py-0.5"
            >
              DEFAULT EPOCH
            </button>
            <button
              type="button"
              onClick={() => {
                const currentToday = getTodayUtcIso();
                setTodayIso(currentToday);
                onChange(currentToday);
                setOpen(false);
              }}
              className="px-2 py-0.5 border border-white/45 bg-[#0C0C0C] hover:border-white text-white rounded-[2px] cursor-pointer"
            >
              TODAY (UTC)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}