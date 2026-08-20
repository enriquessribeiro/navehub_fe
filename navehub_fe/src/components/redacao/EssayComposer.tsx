import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface EssayComposerProps {
  onEnviar: (params: { tema: string; texto: string }) => Promise<void>;
}

const MIN_CARACTERES = 200;

export function EssayComposer({ onEnviar }: EssayComposerProps) {
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function lidarComEnvio(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!tema.trim()) {
      setErro("Dê um tema para a sua redação.");
      return;
    }
    if (texto.trim().length < MIN_CARACTERES) {
      setErro(`Escreva pelo menos ${MIN_CARACTERES} caracteres antes de enviar.`);
      return;
    }

    setEnviando(true);
    try {
      await onEnviar({ tema: tema.trim(), texto: texto.trim() });
      setTema("");
      setTexto("");
    } catch (erroEnvio) {
      setErro(erroEnvio instanceof Error ? erroEnvio.message : "Não foi possível enviar sua redação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={lidarComEnvio} className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Envie sua redação</h2>
          <p className="mt-1 text-sm text-muted">Digite o texto diretamente aqui — sem upload de arquivo por enquanto.</p>
        </div>

        <Input
          label="Tema"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ex.: Desafios da educação a distância no Brasil"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="texto-redacao" className="text-sm font-medium text-ink">
            Redação
          </label>
          <textarea
            id="texto-redacao"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={14}
            placeholder="Escreva sua redação aqui…"
            className="rounded-control border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-nave-yellow-strong focus:outline-none focus:ring-2 focus:ring-nave-yellow/40"
          />
          <p className="text-right font-mono text-xs text-muted">{texto.trim().length} caracteres</p>
        </div>

        {erro && <p className="text-sm font-medium text-danger">{erro}</p>}

        <Button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar redação"}
        </Button>
      </form>
    </Card>
  );
}
