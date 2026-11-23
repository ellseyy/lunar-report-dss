"use client";

import React, { useEffect, useRef, useState } from "react";

interface AsciiLunarIdleProps {
  lat: string;
  lon: string;
  onCoordinatesChange?: (nextLat: string, nextLon: string) => void;
}

const ASCII_RAMP = " .:-=+*#%@";

function clampLat(val: number): number {
  return Math.max(-90, Math.min(90, val));
}

function wrapLon(val: number): number {
  let wrapped = (((val + 180) % 360) + 360) % 360 - 180;
  if (wrapped === -180 && val > 0) wrapped = 180;
  return wrapped;
}

export function AsciiLunarIdle({
  lat,
  lon,
  onCoordinatesChange,
}: AsciiLunarIdleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<{ lat: number; lon: number }>({
    lat: 0.67,
    lon: 23.47,
  });
  const currentRotRef = useRef<{ latRad: number; lonRad: number }>({
    latRad: (0.67 * Math.PI) / 180,
    lonRad: (23.47 * Math.PI) / 180,
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    startLat: number;
    startLon: number;
  }>({ x: 0, y: 0, startLat: 0.67, startLon: 23.47 });

  const [isDragging, setIsDragging] = useState(false);

  // Sync external input changes (presets or manual typing) when not actively dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    const parsedLat = Number(lat);
    const parsedLon = Number(lon);
    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLon)) {
      targetRef.current = {
        lat: clampLat(parsedLat),
        lon: wrapLon(parsedLon),
      };
    }
  }, [lat, lon]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startLat: targetRef.current.lat,
      startLon: targetRef.current.lon,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const lonSensitivity = 180 / Math.max(rect.width * 0.55, 160);
    const latSensitivity = 140 / Math.max(rect.height * 0.75, 140);

    const nextLon = wrapLon(dragStartRef.current.startLon - dx * lonSensitivity);
    const nextLat = clampLat(dragStartRef.current.startLat + dy * latSensitivity);

    targetRef.current = { lat: nextLat, lon: nextLon };
    currentRotRef.current = {
      latRad: (nextLat * Math.PI) / 180,
      lonRad: (nextLon * Math.PI) / 180,
    };

    onCoordinatesChange?.(nextLat.toFixed(2), nextLon.toFixed(2));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Procedural relief noise simulating lunar craters and maria
    const craterNoise = (x: number, y: number, z: number) => {
      const n1 = Math.sin(x * 4.8 + y * 3.5) * Math.cos(z * 4.4 - x * 2.3);
      const n2 = Math.sin(x * 11.7 - z * 10.2 + y * 8.6) * 0.45;
      const n3 = Math.cos(y * 21.0 + x * 17.5) * 0.22;
      return n1 + n2 + n3;
    };

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      const isMobile = width < 460;
      const charW = isMobile ? 6.5 : 7.5;
      const charH = isMobile ? 11 : 12.5;
      const cols = Math.floor(width / charW);
      const rows = Math.floor(height / charH);

      ctx.font = `600 ${isMobile ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textBaseline = "top";

      const t = time * 0.0004;
      const desiredLonRad = (targetRef.current.lon * Math.PI) / 180;
      const desiredLatRad = (targetRef.current.lat * Math.PI) / 180;

      if (!isDraggingRef.current) {
        currentRotRef.current.lonRad +=
          (desiredLonRad - currentRotRef.current.lonRad) * 0.08;
        currentRotRef.current.latRad +=
          (desiredLatRad - currentRotRef.current.latRad) * 0.08;
      }

      const idleWobble = isDraggingRef.current ? 0 : Math.sin(t * 0.65) * 0.06;
      const spin = currentRotRef.current.lonRad + idleWobble;
      const tilt = currentRotRef.current.latRad;

      // Top-left solar illumination vector
      const sunAngle = -2.25 + Math.sin(t * 0.5) * 0.15;
      const lx = Math.cos(sunAngle) * 0.85;
      const ly = -0.32;
      const lz = Math.sin(sunAngle) * 0.4 + 0.62;
      const lLen = Math.hypot(lx, ly, lz);
      const sunX = lx / lLen;
      const sunY = ly / lLen;
      const sunZ = lz / lLen;

      const cx = cols * 0.5;
      const cy = rows * 0.5;
      const aspect = charW / charH;
      const radius = Math.min(cols * aspect, rows) * 0.46;

      const offsetX = (width - cols * charW) * 0.5;
      const offsetY = (height - rows * charH) * 0.5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = ((c - cx) * aspect) / radius;
          const ny = (r - cy) / radius;
          const r2 = nx * nx + ny * ny;

          const px = offsetX + c * charW;
          const py = offsetY + r * charH;

          if (r2 <= 1.0) {
            const nz = Math.sqrt(1.0 - r2);

            const y1 = ny * Math.cos(tilt) + nz * Math.sin(tilt);
            const z1 = -ny * Math.sin(tilt) + nz * Math.cos(tilt);
            const x2 = nx * Math.cos(spin) + z1 * Math.sin(spin);
            const z2 = -nx * Math.sin(spin) + z1 * Math.cos(spin);

            const relief = craterNoise(x2, y1, z2);
            const diffuse = nx * sunX + ny * sunY + nz * sunZ;

            let lum = Math.max(0, diffuse) * 0.78 + relief * 0.14 + 0.13;
            lum = Math.max(0.11, Math.min(0.99, lum));

            const charIdx = Math.min(
              ASCII_RAMP.length - 1,
              Math.floor(lum * ASCII_RAMP.length),
            );
            const ch = ASCII_RAMP[charIdx];

            const hash =
              Math.sin(c * 12.9898 + r * 78.233 + Math.floor(time / 500)) *
              43758.5453;
            const rand = hash - Math.floor(hash);

            if (rand > 0.9965 && lum > 0.3) {
              ctx.fillStyle = "rgba(96, 165, 250, 0.9)";
            } else {
              const alpha = 0.22 + lum * 0.78;
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
            }

            ctx.fillText(ch, px, py);
          } else {
            // Subtle background starfield and telemetry noise
            const starHash = Math.sin(c * 91.7 + r * 37.3) * 19341.73;
            const starRand = starHash - Math.floor(starHash);
            if (starRand > 0.991) {
              const twinkle = 0.14 + 0.18 * Math.sin(time * 0.002 + c + r);
              ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(2)})`;
              ctx.fillText(starRand > 0.996 ? "+" : ".", px, py);
            }
          }
        }
      }

      // Target vector reticle locked to center
      const crossX = Math.round(cx) * charW + offsetX;
      const crossY = Math.round(cy) * charH + offsetY;
      ctx.fillStyle = "#050505";
      ctx.fillRect(crossX - charW * 1.1, crossY - 1, charW * 3.2, charH + 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("[+]", crossX - charW, crossY);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  const latStr = Number.isFinite(parsedLat)
    ? `${Math.abs(parsedLat).toFixed(2)}° ${parsedLat >= 0 ? "N" : "S"}`
    : "0.00° N";
  const lonStr = Number.isFinite(parsedLon)
    ? `${Math.abs(parsedLon).toFixed(2)}° ${parsedLon >= 0 ? "E" : "W"}`
    : "0.00° E";

  return (
    <section className="w-full border border-white bg-[#050505] p-3.5 sm:p-5 font-sans antialiased select-none">
      {/* Header matching mission control sections */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/20 text-[10px] font-semibold uppercase tracking-widest tabular-nums">
        <span className="text-neutral-400">
          {isDragging
            ? "SLEWING SELENOGRAPHIC VECTOR..."
            : "DRAG GLOBE TO AIM // STANDBY"}
        </span>
        <span className="px-1.5 py-0.5 border border-white/40 bg-[#0C0C0C] text-[9px] text-white">
          LOLA LDEM_64
        </span>
      </div>

      {/* Interactive ASCII lunar canvas */}
      <div className="relative w-full h-56 sm:h-64 my-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full block touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          aria-label="Interactive ASCII Lunar Globe"
        />
      </div>

      {/* Footer divider and live target status */}
      <div className="pt-2.5 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] uppercase tracking-widest tabular-nums">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">VECTOR:</span>
          <span className="px-2 py-0.5 border border-white/45 bg-[#0C0C0C] text-white font-semibold rounded-[2px]">
            {latStr}, {lonStr}
          </span>
        </div>
        <span className="text-neutral-400">
          {isDragging ? "LOCKING COORDINATES" : "DRAG OR ENTER COORDS"}
        </span>
      </div>
    </section>
  );
}