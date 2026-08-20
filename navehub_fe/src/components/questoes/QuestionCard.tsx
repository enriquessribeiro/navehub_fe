import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { ROTULOS_AREA } from "@/components/questoes/QuestionFilters";
import type { AlternativaJson, QuestionRow } from "@/types/database.types";

type Letra = AlternativaJson["letra"];

/** URLs de imagem que já aparecem inline no enunciado (sintaxe `![](url)` do
 *  Markdown) — as figuras não podem ser renderizadas de novo no rodapé. */
function arquivosNaoReferenciadosNoEnunciado(questao: QuestionRow): string[] {
  if (!questao.enunciado) return questao.arquivos;
  return questao.arquivos.filter((url) => !questao.enunciado?.includes(url));
}

interface QuestionCardProps {
  questao: QuestionRow;
  numero: number;
  total: number;
  /** Deve rejeitar (throw) se o salvamento da tentativa falhar — só então a
   *  resposta é marcada como escolhida, evitando "falso sucesso". */
  onResponder: (params: {
    respostaLetra: Letra;
    correta: boolean;
  }) => Promise<void>;
  onProxima: () => void;
  temProxima: boolean;
}

export function QuestionCard({
  questao,
  numero,
  total,
  onResponder,
  onProxima,
  temProxima,
}: QuestionCardProps) {
  const [selecionada, setSelecionada] = useState<Letra | null>(null);
  const [revelada, setRevelada] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);

  const arquivosRodape = arquivosNaoReferenciadosNoEnunciado(questao);

  async function escolher(letra: Letra) {
    // resposta já registrada, ou salvando — não deixa trocar nem clicar 2x
    if (selecionada !== null || salvando) return;
    setSalvando(true);
    setErroSalvamento(null);
    try {
      await onResponder({
        respostaLetra: letra,
        correta: letra === questao.gabarito,
      });
      setSelecionada(letra);
    } catch (erroResposta) {
      // Se o salvamento falhou, a questão NÃO é marcada como respondida e
      // o aluno vê o motivo — pode tentar de novo.
      setErroSalvamento(
        erroResposta instanceof Error
          ? erroResposta.message
          : "Não foi possível salvar sua resposta. Tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">ENEM {questao.ano}</Badge>
          {questao.area && (
            <Badge tone="neutral">{ROTULOS_AREA[questao.area]}</Badge>
          )}
          {questao.materia && <Badge tone="accent">{questao.materia}</Badge>}
          {questao.assunto && <Badge tone="accent">{questao.assunto}</Badge>}
        </div>
        <span className="font-mono text-xs text-muted">
          Questão {numero} de {total}
        </span>
      </div>

      <div className="space-y-3">
        {questao.enunciado && (
          // A API enem.dev entrega o enunciado em Markdown (figuras `![](url)`
          // inline no meio do texto). Renderizado como texto puro, o markdown
          // aparecia cru ("link" da figura) e a imagem só vinha no rodapé.
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
              p: ({ children }) => (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {children}
                </p>
              ),
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt ?? "Figura da questão"}
                  className="max-w-full max-h-96 rounded-control border border-line"
                />
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-ink">{children}</strong>
              ),
            }}
          >
            {questao.enunciado}
          </ReactMarkdown>
        )}
        {arquivosRodape.length > 0 && (
          <div className="flex flex-col gap-3">
            {arquivosRodape.map((url) => (
              <img
                key={url}
                src={url}
                alt="Figura de apoio da questão"
                className="max-w-md max-h-96 rounded-control border border-line"
              />
            ))}
          </div>
        )}
        {questao.introducao_alternativas && (
          <p className="text-sm font-medium text-ink">
            {questao.introducao_alternativas}
          </p>
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
              onClick={() => void escolher(alternativa.letra)}
              disabled={selecionada !== null || salvando}
              aria-pressed={selecionada === alternativa.letra}
              className={cn(
                // Com imagem, empilha o conteúdo (texto em cima, imagem abaixo);
                // sem imagem, mantém o layout horizontal atual.
                "flex w-full gap-3 rounded-control border px-4 py-3 text-left text-sm transition-colors",
                alternativa.arquivo ? "flex-col" : "items-start",
                "disabled:cursor-default",
                !mostrarResultado &&
                  "border-line hover:border-nave-yellow-strong",
                mostrarResultado &&
                  éCorreta &&
                  "border-success bg-success-soft",
                mostrarResultado &&
                  éSelecionada &&
                  !éCorreta &&
                  "border-danger bg-danger-soft",
                mostrarResultado &&
                  !éSelecionada &&
                  !éCorreta &&
                  "border-line opacity-60",
              )}
            >
              <span className="font-mono font-semibold text-ink">
                {alternativa.letra})
              </span>
              <span className="text-ink">{alternativa.texto}</span>
              {alternativa.arquivo && (
                <img
                  src={alternativa.arquivo}
                  alt={`Imagem da alternativa ${alternativa.letra}`}
                  className="max-w-xs rounded-control border border-line"
                />
              )}
              {mostrarResultado && (
                <span className="sr-only">
                  {éCorreta
                    ? "Resposta correta"
                    : éSelecionada
                      ? "Sua resposta, incorreta"
                      : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {erroSalvamento && (
        <p className="text-sm font-medium text-danger">
          {erroSalvamento} — escolha a alternativa de novo para tentar salvar.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          variant="ghost"
          onClick={() => setRevelada(true)}
          disabled={!selecionada}
        >
          Ver gabarito
        </Button>
        <Button onClick={onProxima} disabled={!temProxima || salvando}>
          Próxima questão →
        </Button>
      </div>
    </Card>
  );
}
