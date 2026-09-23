'use client';

interface UploadProgressBarProps {
  percent: number;
  label?: string;
  isArabic?: boolean;
  className?: string;
}

/** Shared upload progress meter for document / media / report uploads */
export function UploadProgressBar({ percent, label, isArabic = true, className = '' }: UploadProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const text =
    label ||
    (isArabic ? `جاري الرفع والمعالجة…` : `Uploading & processing…`);

  return (
    <div
      className={`w-full space-y-2 rounded-xl border border-cyan-500/35 bg-slate-950/80 backdrop-blur-md px-3.5 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.15)] ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-100">
        <span className="text-slate-200">{text}</span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-cyan-300 font-bold px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400/40 shadow-inner">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-medium">
            {isArabic ? 'المنجز' : 'Done'}
          </span>
          <span className="text-xs font-black text-cyan-200">{pct}%</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-300 transition-[width] duration-200 ease-out shadow-[0_0_12px_rgba(34,211,238,0.6)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

