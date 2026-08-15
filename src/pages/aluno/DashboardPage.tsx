import { useEffect, useState } from "react";
import { ContinuarDeOndeParouCard } from "@/components/dashboard/SuggestionCard";
import { MetaModal } from "@/components/dashboard/MetaModal";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { DesempenhoPorAreaChart } from "@/components/dashboard/DesempenhoPorAreaChart";
import { EvolucaoChart } from "@/components/dashboard/EvolucaoChart";
import type { PeriodoEvolucao } from "@/components/dashboard/EvolucaoChart";
import { PERIODOS_EVOLUCAO } from "@/components/dashboard/EvolucaoChart";
import { useAuth } from "@/contexts/AuthContext";
import { lerUltimaAtividade } from "@/lib/continuarDeOndeParou";
import {
  atualizarMetaQuestoes,
  contarQuestoesDaSemana,
  getEstatisticasAluno,
  getEvolucaoAluno,
} from "@/services/questionsService";
import type { EstatisticasAluno, PontoEvolucao } from "@/services/questionsService";
import { listarMinhasRedacoes } from "@/services/essaysService";

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M4 10.5 8 14l8-9" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth={1.6} />
      <circle cx="14" cy="14" r="2.2" stroke="currentColor" strokeWidth={1.6} />
      <path d="M15 5 5 15" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function IconMeta() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M5 3v14" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M5 4h9l-2.5 3L14 10H5" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

function IconRedacao() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M12.5 3.5 16 7 7 16H3.5v-3.5L12.5 3.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardPage() {
  const { profile, atualizarMetaNoPerfil } = useAuth();
  const [estatisticas, setEstatisticas] = useState<EstatisticasAluno | null>(null);
  const [evolucao, setEvolucao] = useState<PontoEvolucao[]>([]);
  const [dias, setDias] = useState<PeriodoEvolucao>(30);
  const [redacoesEnviadas, setRedacoesEnviadas] = useState<number | null>(null);
  const [questoesNaSemana, setQuestoesNaSemana] = useState<number | null>(null);
  const [metaAberta, setMetaAberta] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!profile) return;

    let ativo = true;
    setCarregando(true);

    Promise.all([
      getEstatisticasAluno(profile.id),
      getEvolucaoAluno(profile.id),
      listarMinhasRedacoes(profile.id),
      contarQuestoesDaSemana(profile.id),
    ])
      .then(([stats, evolucaoAluno, redacoes, feitasNaSemana]) => {
        if (!ativo) return;
        setEstatisticas(stats);
        setEvolucao(evolucaoAluno);
        setRedacoesEnviadas(redacoes.length);
        setQuestoesNaSemana(feitasNaSemana);
      })
      .catch((erro) => console.error("[navehub] erro ao carregar dashboard:", erro))
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [profile]);

  if (!profile) return null;

  const ultimaAtividade = lerUltimaAtividade(profile.id);

  async function lidarComSalvarMeta(meta: number) {
    await atualizarMetaQuestoes(meta);
    atualizarMetaNoPerfil(meta);
    setMetaAberta(false);
  }

  const percentualMeta =
    profile.meta_questoes > 0
      ? Math.round(((questoesNaSemana ?? 0) / profile.meta_questoes) * 100)
      : 0;

  return (
    <>
      <Topbar titulo={`Bem-vindo, ${profile.nome}! 👋`} subtitulo="Vamos juntos rumo à sua aprovação." />

      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Questões feitas" valor={carregando ? "…" : String(estatisticas?.questoesFeitas ?? 0)} icone={<IconCheck />} />
          <StatCard
            label="% de acerto"
            valor={carregando ? "…" : `${estatisticas?.percentualAcerto ?? 0}%`}
            icone={<IconPercent />}
          />
          <StatCard
            label="Meta semanal — clique para ajustar"
            valor={carregando ? "…" : `${questoesNaSemana ?? 0}/${profile.meta_questoes}`}
            icone={<IconMeta />}
            onClick={() => setMetaAberta(true)}
          />
          <StatCard label="Redações enviadas" valor={carregando ? "…" : String(redacoesEnviadas ?? 0)} icone={<IconRedacao />} />
        </div>

        {!carregando && (
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">Progresso da meta semanal</p>
              <p className="font-mono text-xs text-muted">
                {questoesNaSemana ?? 0}/{profile.meta_questoes} questões ({percentualMeta}%)
              </p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/60">
              <div
                className={`h-full rounded-full transition-all ${
                  percentualMeta === 0
                    ? "bg-danger"
                    : percentualMeta >= 100
                      ? "bg-success"
                      : "bg-nave-yellow"
                }`}
                style={{ width: `${Math.min(percentualMeta, 100)}%` }}
              />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Seu desempenho</h2>
            </div>

            <DesempenhoPorAreaChart desempenho={estatisticas?.desempenhoPorArea ?? {}} carregando={carregando} />
          </Card>

          <ContinuarDeOndeParouCard atividade={ultimaAtividade} />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">Evolução</h2>
            <div className="flex rounded-control border border-line bg-canvas p-0.5 text-xs">
              {PERIODOS_EVOLUCAO.map((periodo) => (
                <button
                  key={periodo}
                  type="button"
                  onClick={() => setDias(periodo)}
                  className={`rounded-control px-3 py-1.5 font-medium transition-colors ${
                    periodo === dias ? "bg-nave-black text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {periodo} dias
                </button>
              ))}
            </div>
          </div>

          <EvolucaoChart dados={evolucao} dias={dias} carregando={carregando} />
        </Card>
      </div>

      {metaAberta && (
        <MetaModal
          metaAtual={profile.meta_questoes}
          onFechar={() => setMetaAberta(false)}
          onSalvar={lidarComSalvarMeta}
        />
      )}
    </>
  );
}
