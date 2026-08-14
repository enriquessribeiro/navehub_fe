import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EssayComNomes } from "@/services/essaysService";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface EssayListProps {
  redacoes: EssayComNomes[];
  /** Mostra o nome do aluno em cada item — útil nas telas do professor. */
  mostrarNomeAluno?: boolean;
  vazio: string;
  onCorrigir?: (redacao: EssayComNomes) => void;
}

export function EssayList({ redacoes, mostrarNomeAluno, vazio, onCorrigir }: EssayListProps) {
  if (redacoes.length === 0) {
    return (
      <Card className="flex items-center justify-center py-12 text-center">
        <p className="text-sm text-muted">{vazio}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {redacoes.map((redacao) => (
        <Card key={redacao.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold text-ink">{redacao.tema}</p>
              <p className="mt-0.5 text-xs text-muted">
                {mostrarNomeAluno && redacao.aluno ? `${redacao.aluno.nome} · ` : ""}
                Enviada em {formatarData(redacao.enviada_em)}
              </p>
            </div>
            <Badge tone={redacao.status === "corrigida" ? "success" : "pending"}>
              {redacao.status === "corrigida" ? "Corrigida" : "Pendente"}
            </Badge>
          </div>

          {redacao.status === "corrigida" && (
            <div className="rounded-control bg-canvas p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Nota: {redacao.nota}/1000</p>
                {redacao.professor && <p className="text-xs text-muted">Corrigida por {redacao.professor.nome}</p>}
              </div>
              {redacao.feedback && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{redacao.feedback}</p>}
            </div>
          )}

          {redacao.status === "pendente" && onCorrigir && (
            <div className="flex justify-end">
              <Button onClick={() => onCorrigir(redacao)}>Corrigir</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
