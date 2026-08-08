import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QuestionCard } from "@/components/questoes/QuestionCard";
import { QuestionFilters } from "@/components/questoes/QuestionFilters";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { salvarUltimaAtividade } from "@/lib/continuarDeOndeParou";
import { listQuestions, registrarTentativa } from "@/services/questionsService";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

interface EstadoNavegacao {
  area?: AreaEnem | null;
  ano?: number | null;
  idioma?: string | null;
}

export function QuestoesPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const estadoInicial = location.state as EstadoNavegacao | null;

  const [ano, setAno] = useState<number | null>(estadoInicial?.ano ?? null);
  const [area, setArea] = useState<AreaEnem | null>(estadoInicial?.area ?? null);
  const [idioma, setIdioma] = useState<string | null>(estadoInicial?.idioma ?? "portugues");
  const [pagina, setPagina] = useState(1);

  const [questoes, setQuestoes] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(
    async (paginaAlvo: number) => {
      setCarregando(true);
      setErro(null);
      try {
        const resultado = await listQuestions({ ano, area, idioma, pagina: paginaAlvo, porPagina: 1 });
        setQuestoes(resultado.questoes);
        setTotal(resultado.total);
      } catch (erroBusca) {
        setErro(erroBusca instanceof Error ? erroBusca.message : "Não foi possível buscar as questões.");
        setQuestoes([]);
        setTotal(0);
      } finally {
        setCarregando(false);
      }
    },
    [ano, area, idioma]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void buscar(1);
  }, []);

  function lidarComBusca() {
    setPagina(1);
    if (profile) {
      salvarUltimaAtividade(profile.id, { area, ano, idioma });
    }
    void buscar(1);
  }

  function lidarComProxima() {
    const proximaPagina = pagina + 1;
    setPagina(proximaPagina);
    void buscar(proximaPagina);
  }

  async function lidarComResposta(params: { respostaLetra: "A" | "B" | "C" | "D" | "E"; correta: boolean }) {
    if (!profile || questoes.length === 0) return;
    try {
      await registrarTentativa({
        alunoId: profile.id,
        questionId: questoes[0].id,
        respostaDada: params.respostaLetra,
        correta: params.correta,
      });
    } catch (erroResposta) {
      console.error("[navehub] erro ao registrar tentativa:", erroResposta);
    }
  }

  const questaoAtual = questoes[0];

  return (
    <>
      <Topbar titulo="Questões" subtitulo="Pratique, aprenda e acompanhe seu progresso." />

      <div className="space-y-6 p-8">
        <Card>
          <QuestionFilters
            ano={ano}
            area={area}
            idioma={idioma}
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
            numero={pagina}
            total={total}
            onResponder={lidarComResposta}
            onProxima={lidarComProxima}
            temProxima={pagina < total}
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
