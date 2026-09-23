'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ActionLoadingBarProps {
  active: boolean;
  /** 0–100 when known (uploads); omit for realistic auto-incrementing save counter */
  percent?: number;
  label?: string;
  isArabic?: boolean;
  className?: string;
}

/** Loading / progress meter with live counter for add & edit modals and cards */
export function ActionLoadingBar({
  active,
  percent,
  label,
  isArabic = true,
  className = ''
}: ActionLoadingBarProps) {
  const [simulatedPct, setSimulatedPct] = useState(12);

  useEffect(() => {
    if (!active) {
      setSimulatedPct(12);
      return;
    }
    if (typeof percent === 'number' && Number.isFinite(percent)) {
      return;
    }

    // Realistic progressive loading counter simulation starting from 15% up to 96%
    setSimulatedPct(15);
    const interval = setInterval(() => {
      setSimulatedPct((prev) => {
        if (prev < 42) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 72) return prev + Math.floor(Math.random() * 6) + 3;
        if (prev < 88) return prev + Math.floor(Math.random() * 4) + 2;
        if (prev < 96) return prev + 1;
        return 96;
      });
    }, 240);

    return () => clearInterval(interval);
  }, [active, percent]);

  if (!active) return null;

  const hasExplicitPct = typeof percent === 'number' && Number.isFinite(percent);
  const currentPct = hasExplicitPct
    ? Math.max(0, Math.min(100, Math.round(percent!)))
    : simulatedPct;

  const defaultText = isArabic
    ? `جاري المعالجة والحفظ…`
    : `Saving & processing…`;
  const text = label || defaultText;

  return (
    <div
      className={`w-full space-y-2.5 rounded-xl border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md px-3.5 py-3 shadow-[0_0_24px_rgba(6,182,212,0.2)] ${className}`}
      role="progressbar"
      aria-valuenow={currentPct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-100">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
          <span className="text-slate-200">{text}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-cyan-300 font-bold px-2.5 py-0.5 rounded-lg bg-cyan-950/90 border border-cyan-400/40 shadow-inner">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-medium">
            {isArabic ? 'عداد الإنجاز' : 'Progress'}
          </span>
          <span className="text-sm font-black text-cyan-200">{currentPct}%</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden relative p-[1px]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-300 transition-[width] duration-300 ease-out shadow-[0_0_14px_rgba(34,211,238,0.7)]"
          style={{ width: `${currentPct}%` }}
        />
      </div>
    </div>
  );
}
