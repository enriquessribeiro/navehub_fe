import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QuestionCard } from "@/components/questoes/QuestionCard";
import { QuestionFilters } from "@/components/questoes/QuestionFilters";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { salvarUltimaAtividade } from "@/lib/continuarDeOndeParou";
import { listarAnosDisponiveis, listQuestions, registrarTentativa } from "@/services/questionsService";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

interface EstadoNavegacao {
  area?: AreaEnem | null;
  ano?: number | null;
  idioma?: string | null;
}

/** Questões por requisição. O aluno continua vendo "uma de cada vez", mas a
 *  paginação vai em lote: navegar entre questões do mesmo lote não faz ida
 *  ao banco, e o `count` exato só acontece quando um lote esgota. */
const LOTE_POR_PAGINA = 20;

export function QuestoesPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const estadoInicial = location.state as EstadoNavegacao | null;

  const [ano, setAno] = useState<number | null>(estadoInicial?.ano ?? null);
  const [area, setArea] = useState<AreaEnem | null>(estadoInicial?.area ?? null);
  const [idioma, setIdioma] = useState<string | null>(estadoInicial?.idioma ?? "portugues");

  const [questoes, setQuestoes] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [indice, setIndice] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[] | null>(null);

  const buscarPrimeiraPagina = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listQuestions({ ano, area, idioma, pagina: 1, porPagina: LOTE_POR_PAGINA });
      setQuestoes(resultado.questoes);
      setTotal(resultado.total);
      setIndice(0);
    } catch (erroBusca) {
      setErro(erroBusca instanceof Error ? erroBusca.message : "Não foi possível buscar as questões.");
      setQuestoes([]);
      setTotal(0);
      setIndice(0);
    } finally {
      setCarregando(false);
    }
  }, [ano, area, idioma]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void buscarPrimeiraPagina();
  }, []);

  useEffect(() => {
    void listarAnosDisponiveis().then(setAnosDisponiveis);
  }, []);

  function lidarComBusca() {
    if (profile) {
      salvarUltimaAtividade(profile.id, { area, ano, idioma });
    }
    void buscarPrimeiraPagina();
  }

  async function buscarProximaPagina() {
    // Próxima página do servidor baseada no tamanho do buffer acumulado.
    const proximaPagina = Math.floor(questoes.length / LOTE_POR_PAGINA) + 1;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listQuestions({ ano, area, idioma, pagina: proximaPagina, porPagina: LOTE_POR_PAGINA });
      setQuestoes((atual) => [...atual, ...resultado.questoes]);
      setTotal(resultado.total);
      if (resultado.questoes.length > 0) {
        setIndice((atual) => atual + 1);
      }
    } catch (erroBusca) {
      setErro(erroBusca instanceof Error ? erroBusca.message : "Não foi possível carregar mais questões.");
    } finally {
      setCarregando(false);
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
      questionId: questoes[indice].id,
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
            idioma={idioma}
            anos={anosDisponiveis ?? undefined}
            onChangeAno={setAno}
            onChangeArea={setArea}
            onChangeIdioma={setIdioma}
            onBuscar={lidarComBusca}
            carregando={carregando}
          />
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
            key={questaoAtual.id}
            questao={questaoAtual}
            numero={indice + 1}
            total={total}
            onResponder={lidarComResposta}
            onProxima={lidarComProxima}
            temProxima={indice < total - 1}
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