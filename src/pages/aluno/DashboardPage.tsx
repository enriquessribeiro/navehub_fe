import { useEffect, useState } from "react";
import { ROTULOS_AREA } from "@/components/questoes/QuestionFilters";
import { ContinuarDeOndeParouCard } from "@/components/dashboard/SuggestionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { ProgressTrail } from "@/components/ui/ProgressTrail";
import { AreaBar } from "@/components/ui/AreaBar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { lerUltimaAtividade } from "@/lib/continuarDeOndeParou";
import { getEstatisticasAluno } from "@/services/questionsService";
import type { EstatisticasAluno } from "@/services/questionsService";
import { listarMinhasRedacoes } from "@/services/essaysService";
import type { AreaEnem } from "@/types/database.types";

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
  const { profile } = useAuth();
  const [estatisticas, setEstatisticas] = useState<EstatisticasAluno | null>(null);
  const [redacoesEnviadas, setRedacoesEnviadas] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!profile) return;

    let ativo = true;
    setCarregando(true);

    Promise.all([getEstatisticasAluno(profile.id), listarMinhasRedacoes(profile.id)])
      .then(([stats, redacoes]) => {
        if (!ativo) return;
        setEstatisticas(stats);
        setRedacoesEnviadas(redacoes.length);
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
  const areas = Object.keys(ROTULOS_AREA) as AreaEnem[];

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
          <StatCard label="Meta de questões" valor={`${estatisticas?.questoesFeitas ?? 0}/${profile.meta_questoes}`} icone={<IconMeta />} />
          <StatCard label="Redações enviadas" valor={carregando ? "…" : String(redacoesEnviadas ?? 0)} icone={<IconRedacao />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Seu desempenho</h2>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Rumo à sua meta</p>
              <ProgressTrail atual={estatisticas?.questoesFeitas ?? 0} meta={profile.meta_questoes} />
            </div>

            {carregando ? (
              <p className="text-sm text-muted">Carregando desempenho…</p>
            ) : areas.every((area) => !estatisticas?.desempenhoPorArea[area]) ? (
              <p className="text-sm text-muted">Responda algumas questões para ver seu desempenho por área.</p>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <AreaBar key={area} label={ROTULOS_AREA[area]} percentual={estatisticas?.desempenhoPorArea[area]?.percentual ?? 0} />
                ))}
              </div>
            )}
          </Card>

          <ContinuarDeOndeParouCard atividade={ultimaAtividade} />
        </div>
      </div>
    </>
  );
}
