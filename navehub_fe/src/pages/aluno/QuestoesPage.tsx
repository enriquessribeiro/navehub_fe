import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QuestionCard } from "@/components/questoes/QuestionCard";
import { QuestionFilters } from "@/components/questoes/QuestionFilters";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { salvarUltimaAtividade } from "@/lib/continuarDeOndeParou";
import {
  listarAnosDisponiveis,
  listarAssuntosDisponiveis,
  listarMateriasDisponiveis,
  listQuestions,
  mapearAreaFiltro,
  registrarTentativa,
  type AreaFiltro,
} from "@/services/questionsService";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

interface EstadoNavegacao {
  area?: AreaFiltro | null;
  ano?: number | null;
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
  const [area, setArea] = useState<AreaFiltro | null>(estadoInicial?.area ?? null);
  const [materia, setMateria] = useState<string | null>(null);
  const [assunto, setAssunto] = useState<string | null>(null);
  const [materias, setMaterias] = useState<string[]>([]);
  const [assuntos, setAssuntos] = useState<string[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(false);
  const [carregandoAssuntos, setCarregandoAssuntos] = useState(false);

  const [questoes, setQuestoes] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [indice, setIndice] = useState(0);
  /** Quantas páginas do servidor já foram buscadas para o buffer atual. */
  const [paginasBuscadas, setPaginasBuscadas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[] | null>(null);

  const areaReal = mapearAreaFiltro(area).area as AreaEnem | null;

  // Matéria recarrega quando a área muda; assunto zera junto.
  useEffect(() => {
    setMateria(null);
    setAssunto(null);
    setAssuntos([]);
    let ativo = true;
    setCarregandoMaterias(true);
    void listarMateriasDisponiveis(areaReal)
      .then((lista) => {
        if (ativo) setMaterias(lista);
      })
      .catch(() => {
        if (ativo) setMaterias([]);
      })
      .finally(() => {
        if (ativo) setCarregandoMaterias(false);
      });
    return () => {
      ativo = false;
    };
  }, [areaReal]);

  // Assunto recarrega quando a matéria (ou a área) muda.
  useEffect(() => {
    setAssunto(null);
    let ativo = true;
    setCarregandoAssuntos(true);
    void listarAssuntosDisponiveis(materia, areaReal)
      .then((lista) => {
        if (ativo) setAssuntos(lista);
      })
      .catch(() => {
        if (ativo) setAssuntos([]);
      })
      .finally(() => {
        if (ativo) setCarregandoAssuntos(false);
      });
    return () => {
      ativo = false;
    };
  }, [materia, areaReal]);

  const buscarPrimeiraPagina = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setPaginasBuscadas(1);
    try {
      const areaConsulta = mapearAreaFiltro(area);
      const resultado = await listQuestions({
        ano,
        area: areaConsulta.area,
        idioma: areaConsulta.idioma,
        materia,
        assunto,
        pagina: 1,
        porPagina: LOTE_POR_PAGINA,
      });
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
  }, [ano, area, materia, assunto]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void buscarPrimeiraPagina();
  }, []);

  useEffect(() => {
    void listarAnosDisponiveis().then(setAnosDisponiveis);
  }, []);

  function lidarComBusca() {
    if (profile) {
      salvarUltimaAtividade(profile.id, { area, ano });
    }
    void buscarPrimeiraPagina();
  }

  async function buscarProximaPagina() {
    // Próxima página derivada do CONTADOR de páginas já buscadas — antes era
    // calculada a partir do tamanho do buffer, o que fazia a última página
    // (parcial, ex.: 5 questões de um total de 45) ser rebuscada e duplicada
    // no buffer. Ex.: com 45 questões, floor(45/20)+1 = 3 rebuscava a página 3.
    const proximaPagina = paginasBuscadas + 1;
    setCarregando(true);
    setErro(null);
    try {
      const areaConsulta = mapearAreaFiltro(area);
      const resultado = await listQuestions({
        ano,
        area: areaConsulta.area,
        idioma: areaConsulta.idioma,
        materia,
        assunto,
        pagina: proximaPagina,
        porPagina: LOTE_POR_PAGINA,
      });
      setQuestoes((atual) => [...atual, ...resultado.questoes]);
      setTotal(resultado.total);
      if (resultado.questoes.length > 0) {
        setPaginasBuscadas(proximaPagina);
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
            materia={materia}
            assunto={assunto}
            materias={materias}
            assuntos={assuntos}
            carregandoMaterias={carregandoMaterias}
            carregandoAssuntos={carregandoAssuntos}
            anos={anosDisponiveis ?? undefined}
            onChangeAno={setAno}
            onChangeArea={setArea}
            onChangeMateria={setMateria}
            onChangeAssunto={setAssunto}
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