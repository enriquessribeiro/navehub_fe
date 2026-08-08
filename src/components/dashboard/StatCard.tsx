import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  valor: string;
  icone: ReactNode;
}

export function StatCard({ label, valor, icone }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-nave-yellow-soft text-nave-yellow-strong">
        {icone}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-semibold leading-tight text-ink">{valor}</p>
        <p className="truncate text-sm text-muted">{label}</p>
      </div>
    </Card>
  );
}
