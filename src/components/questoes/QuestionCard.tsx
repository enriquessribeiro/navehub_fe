import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { ROTULOS_AREA } from "@/components/questoes/QuestionFilters";
import type { AlternativaJson, QuestionRow } from "@/types/database.types";

type Letra = AlternativaJson["letra"];

interface QuestionCardProps {
  questao: QuestionRow;
  numero: number;
  total: number;
  onResponder: (params: { respostaLetra: Letra; correta: boolean }) => void;
  onProxima: () => void;
  temProxima: boolean;
}

export function QuestionCard({ questao, numero, total, onResponder, onProxima, temProxima }: QuestionCardProps) {
  const [selecionada, setSelecionada] = useState<Letra | null>(null);
  const [revelada, setRevelada] = useState(false);

  function escolher(letra: Letra) {
    if (selecionada) return; // resposta já registrada — não deixa trocar depois de escolher
    setSelecionada(letra);
    onResponder({ respostaLetra: letra, correta: letra === questao.gabarito });
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">ENEM {questao.ano}</Badge>
          {questao.area && <Badge tone="neutral">{ROTULOS_AREA[questao.area]}</Badge>}
        </div>
        <span className="font-mono text-xs text-muted">
          Questão {numero} de {total}
        </span>
      </div>

      <div className="space-y-3">
        {questao.enunciado && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{questao.enunciado}</p>
        )}
        {questao.arquivos.length > 0 && (
          <div className="flex flex-col gap-3">
            {questao.arquivos.map((url) => (
              <img key={url} src={url} alt="Figura de apoio da questão" className="max-w-full rounded-control border border-line" />
            ))}
          </div>
        )}
        {questao.introducao_alternativas && (
          <p className="text-sm font-medium text-ink">{questao.introducao_alternativas}</p>
        )}
      </div>

      <div className="space-y-2.5">
        {questao.alternativas.map((alternativa) => {
          const éSelecionada = selecionada === alternativa.letra;
          const éCorreta = alternativa.letra === questao.gabarito;
          const mostrarResultado = revelada || selecionada !== null;

          return (
            <button
              key={alternativa.letra}
              type="button"
              onClick={() => escolher(alternativa.letra)}
              disabled={selecionada !== null}
              className={cn(
                "flex w-full items-start gap-3 rounded-control border px-4 py-3 text-left text-sm transition-colors",
                "disabled:cursor-default",
                !mostrarResultado && "border-line hover:border-nave-yellow-strong",
                mostrarResultado && éCorreta && "border-success bg-success-soft",
                mostrarResultado && éSelecionada && !éCorreta && "border-danger bg-danger-soft",
                mostrarResultado && !éSelecionada && !éCorreta && "border-line opacity-60"
              )}
            >
              <span className="font-mono font-semibold text-ink">{alternativa.letra})</span>
              <span className="text-ink">{alternativa.texto}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" onClick={() => setRevelada(true)} disabled={!selecionada}>
          Ver gabarito
        </Button>
        <Button onClick={onProxima} disabled={!temProxima}>
          Próxima questão →
        </Button>
      </div>
    </Card>
  );
}
