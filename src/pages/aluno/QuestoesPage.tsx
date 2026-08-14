import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { QuestionCard } from "@/components/questoes/QuestionCard";
import { QuestionFilters } from "@/components/questoes/QuestionFilters";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";
import { salvarUltimaAtividade } from "@/lib/continuarDeOndeParou";
import {
  listarAnosDisponiveis,
  listarIdsQuestoesRespondidas,
  listarQuestoesRespondidas,
  listQuestions,
  mapearAreaFiltro,
  registrarTentativa,
  type AreaFiltro,
} from "@/services/questionsService";
import type { QuestionRow } from "@/types/database.types";

interface EstadoNavegacao {
  area?: AreaFiltro | null;
  ano?: number | null;
  resolucao?: FiltroResolucao | null;
}

/** Filtro de situação: todas as questões, só as não respondidas ou só as
 *  respondidas (revisão). */
type FiltroResolucao = "todas" | "nao_respondidas" | "respondidas";

const OPCOES_RESOLUCAO: Array<{ chave: FiltroResolucao; rotulo: string }> = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "nao_respondidas", rotulo: "Não respondidas" },
  { chave: "respondidas", rotulo: "Respondidas" },
];

/** Questões por requisição. O aluno continua vendo "uma de cada vez", mas a
 *  paginação vai em lote: navegar entre questões do mesmo lote não faz ida
 *  ao banco, e o `count` exato só acontece quando um lote esgota. */
const LOTE_POR_PAGINA = 20;

/** Item do buffer de navegação: a questão + (no modo revisão) a resposta que
 *  o aluno deu e se acertou. */
interface QuestaoNoBuffer {
  questao: QuestionRow;
  respostaDada?: "A" | "B" | "C" | "D" | "E";
}

export function QuestoesPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const estadoInicial = location.state as EstadoNavegacao | null;

  const [ano, setAno] = useState<number | null>(estadoInicial?.ano ?? null);
  const [area, setArea] = useState<AreaFiltro | null>(estadoInicial?.area ?? null);
  const [filtroResolucao, setFiltroResolucao] = useState<FiltroResolucao>(
    estadoInicial?.resolucao ?? "todas",
  );

  const [questoes, setQuestoes] = useState<QuestaoNoBuffer[]>([]);
  const [total, setTotal] = useState(0);
  const [indice, setIndice] = useState(0);
  /** Quantas páginas do servidor já foram buscadas para o buffer atual. */
  const [paginasBuscadas, setPaginasBuscadas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[] | null>(null);

  /** Sequência das buscas disparadas — respostas que chegam fora de ordem
   *  (toggle rápido entre modos) são descartadas, evitando buffer misturado. */
  const sequenciaBusca = useRef(0);

  /** Busca o buffer inicial (página 1) de acordo com o filtro de resolução. */
  const buscarPrimeiraPagina = useCallback(async (resolucao: FiltroResolucao) => {
    const sequencia = ++sequenciaBusca.current;
    setCarregando(true);
    setErro(null);
    setPaginasBuscadas(1);
    try {
      const areaConsulta = mapearAreaFiltro(area);
      const filtros = {
        ano,
        area: areaConsulta.area,
        idioma: areaConsulta.idioma,
        pagina: 1,
        porPagina: LOTE_POR_PAGINA,
      };

      let resultado;
      if (resolucao === "respondidas" && profile) {
        const respondidas = await listarQuestoesRespondidas(profile.id, filtros);
        resultado = {
          questoes: respondidas.questoes.map((item) => ({
            questao: item.questao,
            respostaDada: item.respostaDada,
          })),
          total: respondidas.total,
        };
      } else {
        const excluirIds =
          resolucao === "nao_respondidas" && profile
            ? await listarIdsQuestoesRespondidas(profile.id)
            : undefined;
        const todas = await listQuestions(filtros, { excluirIds });
        resultado = {
          questoes: todas.questoes.map((questao) => ({ questao })),
          total: todas.total,
        };
      }

      // Uma busca mais nova já foi disparada? Esta resposta é obsoleta.
      if (sequencia !== sequenciaBusca.current) return;

      setQuestoes(resultado.questoes);
      setTotal(resultado.total);
      setIndice(0);
    } catch (erroBusca) {
      if (sequencia !== sequenciaBusca.current) return;
      setErro(erroBusca instanceof Error ? erroBusca.message : "Não foi possível buscar as questões.");
      setQuestoes([]);
      setTotal(0);
      setIndice(0);
    } finally {
      if (sequencia === sequenciaBusca.current) {
        setCarregando(false);
      }
    }
  }, [ano, area, profile]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void buscarPrimeiraPagina(filtroResolucao);
  }, []);

  useEffect(() => {
    void listarAnosDisponiveis().then(setAnosDisponiveis);
  }, []);

  function lidarComBusca() {
    if (profile) {
      salvarUltimaAtividade(profile.id, { area, ano, resolucao: filtroResolucao });
    }
    void buscarPrimeiraPagina(filtroResolucao);
  }

  async function buscarProximaPagina() {
    // Próxima página derivada do CONTADOR de páginas já buscadas — antes era
    // calculada a partir do tamanho do buffer, o que fazia a última página
    // (parcial, ex.: 5 questões de um total de 45) ser rebuscada e duplicada
    // no buffer. Ex.: com 45 questões, floor(45/20)+1 = 3 rebuscava a página 3.
    // Se o aluno trocou o filtro no meio (buscarPrimeiraPagina disparada), a
    // resposta desta busca é obsoleta — descarta.
    const sequencia = sequenciaBusca.current;
    const proximaPagina = paginasBuscadas + 1;
    setCarregando(true);
    setErro(null);
    try {
      const areaConsulta = mapearAreaFiltro(area);
      const filtros = {
        ano,
        area: areaConsulta.area,
        idioma: areaConsulta.idioma,
        pagina: proximaPagina,
        porPagina: LOTE_POR_PAGINA,
      };

      let novosItens: QuestaoNoBuffer[];
      let totalNovo: number;
      if (filtroResolucao === "respondidas" && profile) {
        const respondidas = await listarQuestoesRespondidas(profile.id, filtros);
        novosItens = respondidas.questoes.map((item) => ({
          questao: item.questao,
          respostaDada: item.respostaDada,
        }));
        totalNovo = respondidas.total;
      } else {
        const excluirIds =
          filtroResolucao === "nao_respondidas" && profile
            ? await listarIdsQuestoesRespondidas(profile.id)
            : undefined;
        const todas = await listQuestions(filtros, { excluirIds });
        novosItens = todas.questoes.map((questao) => ({ questao }));
        totalNovo = todas.total;
      }

      if (sequencia !== sequenciaBusca.current) return;

      setQuestoes((atual) => [...atual, ...novosItens]);
      setTotal(totalNovo);
      if (novosItens.length > 0) {
        setPaginasBuscadas(proximaPagina);
        setIndice((atual) => atual + 1);
      }
    } catch (erroBusca) {
      if (sequencia !== sequenciaBusca.current) return;
      setErro(erroBusca instanceof Error ? erroBusca.message : "Não foi possível carregar mais questões.");
    } finally {
      if (sequencia === sequenciaBusca.current) {
        setCarregando(false);
      }
    }
  }

  function lidarComProxima() {
    if (indice + 1 < questoes.length) {
      setIndice(indice + 1);
      return;
    }
    void buscarProximaPagina();
  }

  async function lidarComResposta(params: { respostaLetra: "A" | "B" | "C" | "D" | "E"; correta: boolean }) {
    // Lança o erro para o QuestionCard exibir — o aluno precisa saber que a
    // resposta dele NÃO foi salva, em vez de um silêncio que parece sucesso.
    if (!profile || questoes[indice] === undefined) return;
    await registrarTentativa({
      alunoId: profile.id,
      questionId: questoes[indice].questao.id,
      respostaDada: params.respostaLetra,
      correta: params.correta,
    });
  }

  const questaoAtual = questoes[indice];

  return (
    <>
      <Topbar titulo="Questões" subtitulo="Pratique, aprenda e acompanhe seu progresso." />

      <div className="space-y-6 p-4 sm:p-8">
        <Card>
          <QuestionFilters
            ano={ano}
            area={area}
            anos={anosDisponiveis ?? undefined}
            onChangeAno={setAno}
            onChangeArea={setArea}
            onBuscar={lidarComBusca}
            carregando={carregando}
          />
        </Card>

        <Card>
          <div className="flex rounded-control border border-line bg-canvas p-0.5 text-xs font-medium">
            {OPCOES_RESOLUCAO.map((opcao) => (
              <button
                key={opcao.chave}
                type="button"
                onClick={() => {
                  setFiltroResolucao(opcao.chave);
                  if (profile) {
                    salvarUltimaAtividade(profile.id, {
                      area,
                      ano,
                      resolucao: opcao.chave,
                    });
                  }
                  void buscarPrimeiraPagina(opcao.chave);
                }}
                className={cn(
                  "rounded-control px-3 py-1.5 transition-colors",
                  filtroResolucao === opcao.chave
                    ? "bg-ink text-canvas"
                    : "text-muted hover:text-ink",
                )}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </Card>

        {!carregando && !erro && (
          <p className="font-mono text-sm text-muted">{total.toLocaleString("pt-BR")} questões encontradas</p>
        )}

        {erro && (
          <Card className="border-danger">
            <p className="text-sm font-medium text-danger">{erro}</p>
          </Card>
        )}

        {carregando && (
          <Card className="flex items-center justify-center py-16">
            <p className="text-sm text-muted">Carregando questão…</p>
          </Card>
        )}

        {!carregando && !erro && questaoAtual && (
          <QuestionCard
            key={questaoAtual.questao.id}
            questao={questaoAtual.questao}
            numero={indice + 1}
            total={total}
            onResponder={lidarComResposta}
            onProxima={lidarComProxima}
            temProxima={indice < total - 1}
            modoRevisao={filtroResolucao === "respondidas"}
            respostaAnterior={questaoAtual.respostaDada ?? null}
          />
        )}

        {!carregando && !erro && !questaoAtual && (
          <Card className="flex items-center justify-center py-16 text-center">
            <p className="text-sm text-muted">Nenhuma questão encontrada para esses filtros.</p>
          </Card>
        )}
      </div>
    </>
  );
}