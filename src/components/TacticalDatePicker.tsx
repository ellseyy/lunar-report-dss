"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TacticalDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (newDate: string) => void;
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

function isValidIsoDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1950 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

function parseUtcDate(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return { year: 2026, month: 10, day: 15 };
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function formatUtcIso(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month, day));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function TacticalDatePicker({ value, onChange }: TacticalDatePickerProps) {
  const parsed = useMemo(() => parseUtcDate(value), [value]);
  const [inputText, setInputText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputText(value);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [value, parsed.year, parsed.month]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInputText(value);
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, value]);

  const calendarCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth, 1));
    const startWeekday = (firstDayUtc.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const cells: Array<{ iso: string; day: number; inCurrentMonth: boolean }> = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      cells.push({
        iso: formatUtcIso(viewYear, viewMonth - 1, d),
        day: d,
        inCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: formatUtcIso(viewYear, viewMonth, d),
        day: d,
        inCurrentMonth: true,
      });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        iso: formatUtcIso(viewYear, viewMonth + 1, d),
        day: d,
        inCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Разрешаем только цифры и дефисы; при вставке 8 цифр подряд форматируем в YYYY-MM-DD
    let cleaned = e.target.value.replace(/[^\d-]/g, "");
    if (/^\d{8}$/.test(cleaned)) {
      cleaned = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    cleaned = cleaned.slice(0, 10);
    setInputText(cleaned);

    if (isValidIsoDate(cleaned)) {
      const nextParsed = parseUtcDate(cleaned);
      setViewYear(nextParsed.year);
      setViewMonth(nextParsed.month);
      onChange(cleaned);
    }
  };

  const handleInputBlur = () => {
    if (isValidIsoDate(inputText)) {
      onChange(inputText);
    } else {
      setInputText(value);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isValidIsoDate(inputText)) {
        onChange(inputText);
        setIsOpen(false);
      } else {
        e.preventDefault();
        setInputText(value);
      }
    }
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  };

  const handleSelectDay = (iso: string) => {
    setInputText(iso);
    onChange(iso);
    setIsOpen(false);
  };

  const handleNextLunarDay = () => {
    const nextIso = formatUtcIso(parsed.year, parsed.month, parsed.day + 30);
    setInputText(nextIso);
    onChange(nextIso);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="w-40 bg-[#0C0C0C] border border-white text-white rounded-[2px] tabular-nums flex items-center justify-between focus-within:bg-white/5">
        <input
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={handleManualInput}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          aria-label="Landing Date (YYYY-MM-DD)"
          className="w-full bg-transparent px-3 py-1.5 text-xs font-semibold text-white placeholder:text-neutral-600 focus:outline-none tabular-nums"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="Toggle Calendar"
          className="px-2.5 py-1.5 text-white hover:bg-white hover:text-[#050505] transition-colors cursor-pointer border-l border-white/25 shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 border border-white bg-[#050505] text-white rounded-[2px] z-50 shadow-2xl tabular-nums">
          {/* Month / Year Navigation Bar */}
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-white bg-[#0C0C0C]">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                title="Previous Year"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-[2px] cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                title="Previous Month"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-[2px] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                title="Next Month"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-[2px] cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                title="Next Year"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-[2px] cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-white/25 bg-[#090909] py-1.5 px-2 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[10px] font-bold tracking-wider text-neutral-400">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5 p-2">
            {calendarCells.map((cell) => {
              const isSelected = cell.iso === value;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDay(cell.iso)}
                  className={`h-7 text-[11px] font-semibold rounded-[2px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#050505] font-extrabold"
                      : cell.inCurrentMonth
                        ? "text-white hover:border hover:border-white hover:bg-[#0C0C0C]"
                        : "text-neutral-600 hover:text-neutral-300"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Lunar Cycle Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/25 bg-[#0C0C0C] text-[10px]">
            <span className="uppercase tracking-widest text-neutral-400">UTC EPOCH</span>
            <button
              type="button"
              onClick={handleNextLunarDay}
              className="px-2 py-0.5 font-bold uppercase tracking-wider border border-white/50 text-white hover:bg-white hover:text-[#050505] rounded-[2px] transition-colors cursor-pointer"
            >
              +1 LUNAR DAY (+30D)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}