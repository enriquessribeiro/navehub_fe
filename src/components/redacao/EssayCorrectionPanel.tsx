import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { EssayComNomes } from "@/services/essaysService";

interface EssayCorrectionPanelProps {
  redacao: EssayComNomes;
  onFechar: () => void;
  onSalvar: (params: { nota: number; feedback: string }) => Promise<void>;
}

export function EssayCorrectionPanel({ redacao, onFechar, onSalvar }: EssayCorrectionPanelProps) {
  const [nota, setNota] = useState("");
  const [feedback, setFeedback] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function lidarComSalvar() {
    setErro(null);
    const notaNumero = Number(nota);

    if (nota.trim() === "" || Number.isNaN(notaNumero) || notaNumero < 0 || notaNumero > 1000) {
      setErro("Informe uma nota entre 0 e 1000.");
      return;
    }
    if (!feedback.trim()) {
      setErro("Escreva um feedback para o aluno.");
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({ nota: notaNumero, feedback: feedback.trim() });
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar a correção.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nave-black/60 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{redacao.tema}</h2>
            <p className="mt-0.5 text-sm text-muted">{redacao.aluno?.nome ?? "Aluno"}</p>
          </div>
          <Button variant="ghost" onClick={onFechar}>
            Fechar
          </Button>
        </div>

        <div className="rounded-control bg-canvas p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{redacao.texto}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
          <Input
            label="Nota (0–1000)"
            type="number"
            min={0}
            max={1000}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-correcao" className="text-sm font-medium text-ink">
              Feedback
            </label>
            <textarea
              id="feedback-correcao"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              placeholder="Comentários sobre a redação…"
              className="rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-nave-yellow-strong focus:outline-none focus:ring-2 focus:ring-nave-yellow/40"
            />
          </div>
        </div>

        {erro && <p className="text-sm font-medium text-danger">{erro}</p>}

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void lidarComSalvar()} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar correção"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
