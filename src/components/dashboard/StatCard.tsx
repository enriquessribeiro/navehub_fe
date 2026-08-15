import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  valor: string;
  icone: ReactNode;
  /** Torna o card clicável (ex.: editar a meta semanal). */
  onClick?: () => void;
}

export function StatCard({ label, valor, icone, onClick }: StatCardProps) {
  if (onClick) {
    // Card clicável precisa ser acessível via teclado: role=button +
    // tabIndex=0 + Enter/Espaço — um <div onClick> sozinho é invisível para
    // leitores de tela e inoperável sem mouse.
    return (
      <Card
        role="button"
        tabIndex={0}
        aria-label={`${label}: ${valor}`}
        onClick={onClick}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            onClick();
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-4 p-5 transition-colors hover:border-nave-yellow-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-nave-yellow/40",
        )}
      >
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
