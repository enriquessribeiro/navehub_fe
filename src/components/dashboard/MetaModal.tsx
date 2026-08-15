import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface MetaModalProps {
  /** Meta atual (ex.: 30). */
  metaAtual: number;
  onFechar: () => void;
  /** Deve rejeitar (throw) se a atualização falhar — o modal mostra o erro
   *  e permanece aberto para re-tentar. */
  onSalvar: (meta: number) => Promise<void>;
}

export function MetaModal({ metaAtual, onFechar, onSalvar }: MetaModalProps) {
  const [valor, setValor] = useState(String(metaAtual));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  // Dialog acessível (mesmo padrão do EssayCorrectionPanel): foco vai pro
  // input ao abrir, ESC fecha, foco volta ao sair e o Tab fica no modal.
  useEffect(() => {
    focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    const input = painelRef.current?.querySelector<HTMLInputElement>("input");
    input?.focus();
    input?.select();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        onFechar();
        return;
      }
      // Enter no input salva direto — o <form> nativo daria esse
      // comportamento grátis, mas o padrão do app não usa formulários.
      if (evento.key === "Enter" && document.activeElement instanceof HTMLInputElement) {
        evento.preventDefault();
        void lidarComSalvar();
        return;
      }
      if (evento.key !== "Tab") return;

      const focaveis = Array.from(
        painelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      focoAnteriorRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lidarComSalvar() {
    setErro(null);
    const meta = Number(valor);

    if (valor.trim() === "" || !Number.isInteger(meta) || meta < 1 || meta > 200) {
      setErro("Informe um número inteiro entre 1 e 200.");
      return;
    }

    setSalvando(true);
    try {
      await onSalvar(meta);
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar a meta.");
      setSalvando(false);
    }
  }

  return (
    <div
      ref={painelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-titulo-meta"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-nave-black/60 p-4 outline-none"
    >
      <Card className="w-full max-w-sm flex-col gap-4">
        <div>
          <h2 id="dialog-titulo-meta" className="font-display text-lg font-semibold text-ink">
            Definir meta semanal
          </h2>
          <p className="mt-1 text-sm text-muted">
            Quantas questões você quer fazer por semana (segunda a domingo)?
          </p>
        </div>

        <Input
          label="Questões por semana"
          type="number"
          min={1}
          max={200}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        {erro && <p className="text-sm font-medium text-danger">{erro}</p>}

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void lidarComSalvar()} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar meta"}
          </Button>
        </div>
      </Card>
    </div>
  );
}