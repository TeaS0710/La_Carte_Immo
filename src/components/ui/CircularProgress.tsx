"use client";

/**
 * Anneau de progression SVG sobre — pas de glow, pas de gradient.
 * Animations conformes à prefers-reduced-motion (transition disabled si reduce).
 */
export default function CircularProgress({
  percent,
  size = 56,
  stroke = 5,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const dash = (pct / 100) * c;

  return (
    <div
      className="relative inline-flex items-center justify-center motion-reduce:transition-none"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? `${Math.round(pct)} % chargé`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{
            transition: "stroke-dasharray 200ms linear",
          }}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular text-ink-soft">
        {Math.round(pct)}%
      </span>
    </div>
  );
}
