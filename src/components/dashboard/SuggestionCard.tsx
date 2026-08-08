import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { UltimaAtividade } from "@/lib/continuarDeOndeParou";

const ROTULOS_AREA: Record<string, string> = {
  matematica: "Matemática",
  linguagens: "Linguagens",
  ciencias_humanas: "Ciências Humanas",
  ciencias_natureza: "Ciências da Natureza",
};

interface ContinuarDeOndeParouCardProps {
  atividade: UltimaAtividade | null;
}

export function ContinuarDeOndeParouCard({ atividade }: ContinuarDeOndeParouCardProps) {
  if (!atividade) {
    return (
      <Card accent className="flex flex-col justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nave-yellow-strong">Vamos começar</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-ink">Resolva sua primeira questão</h3>
          <p className="mt-1.5 text-sm text-muted">
            Assim que você começar a praticar, este espaço vira um atalho direto para continuar de onde parou.
          </p>
        </div>
        <Link to="/questoes">
          <Button className="w-full">Ir para Questões</Button>
        </Link>
      </Card>
    );
  }

  const partesFiltro = [
    atividade.area ? ROTULOS_AREA[atividade.area] : null,
    atividade.ano ? `ENEM ${atividade.ano}` : null,
    atividade.idioma && atividade.idioma !== "portugues" ? atividade.idioma : null,
  ].filter(Boolean);

  return (
    <Card accent className="flex flex-col justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-nave-yellow-strong">Continuar de onde parou</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink">
          {partesFiltro.length > 0 ? partesFiltro.join(" · ") : "Suas últimas questões"}
        </h3>
        <p className="mt-1.5 text-sm text-muted">Retome de onde você parou, com o mesmo filtro de antes.</p>
      </div>
      <Link
        to="/questoes"
        state={{ area: atividade.area, ano: atividade.ano, idioma: atividade.idioma }}
      >
        <Button className="w-full">Continuar</Button>
      </Link>
    </Card>
  );
}
