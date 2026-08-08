interface AreaBarProps {
  label: string;
  percentual: number;
}

export function AreaBar({ label, percentual }: AreaBarProps) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual)));

  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-sm font-medium text-ink">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/70">
        <div className="h-full rounded-full bg-nave-yellow" style={{ width: `${valor}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-sm text-muted">{valor}%</span>
    </div>
  );
}
