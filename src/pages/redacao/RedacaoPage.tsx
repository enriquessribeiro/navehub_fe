import { useEffect, useState } from "react";
import { EssayComposer } from "@/components/redacao/EssayComposer";
import { EssayCorrectionPanel } from "@/components/redacao/EssayCorrectionPanel";
import { EssayList } from "@/components/redacao/EssayList";
import { EssayStepper } from "@/components/redacao/EssayStepper";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";
import {
  assinarFilaDeRedacoes,
  assinarMinhasRedacoes,
  corrigirRedacao,
  enviarRedacao,
  listarMinhasRedacoes,
  listarRedacoesCorrigidas,
  listarRedacoesPendentes,
} from "@/services/essaysService";
import type { EssayComNomes } from "@/services/essaysService";
import type { ProfileRow } from "@/types/database.types";

function Abas({
  opcoes,
  ativa,
  onSelecionar,
}: {
  opcoes: Array<{ chave: string; rotulo: string }>;
  ativa: string;
  onSelecionar: (chave: string) => void;
}) {
  return (
    <div className="inline-flex rounded-control border border-line bg-surface p-1">
      {opcoes.map((opcao) => (
        <button
          key={opcao.chave}
          type="button"
          onClick={() => onSelecionar(opcao.chave)}
          className={cn(
            "rounded-[6px] px-4 py-2 text-sm font-semibold transition-colors",
            ativa === opcao.chave ? "bg-nave-black text-white" : "text-muted hover:text-ink"
          )}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function RedacaoAluno({ profile }: { profile: ProfileRow }) {
  const [aba, setAba] = useState<"enviar" | "minhas">("enviar");
  const [redacoes, setRedacoes] = useState<EssayComNomes[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      setRedacoes(await listarMinhasRedacoes(profile.id));
    } catch (erro) {
      console.error("[navehub] erro ao carregar redações:", erro);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
    const canal = assinarMinhasRedacoes(profile.id, () => void recarregar());
    return () => {
      void canal.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function lidarComEnvio(params: { tema: string; texto: string }) {
    await enviarRedacao({ alunoId: profile.id, tema: params.tema, texto: params.texto });
    setAba("minhas");
    await recarregar();
  }

  return (
    <>
      <Topbar titulo="Redação" subtitulo="Envie sua redação e receba a correção do seu professor." />
      <div className="space-y-6 p-8">
        <Abas
          ativa={aba}
          onSelecionar={(chave) => setAba(chave as "enviar" | "minhas")}
          opcoes={[
            { chave: "enviar", rotulo: "Enviar redação" },
            { chave: "minhas", rotulo: `Minhas redações${redacoes.length > 0 ? ` (${redacoes.length})` : ""}` },
          ]}
        />

        {aba === "enviar" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <EssayComposer onEnviar={lidarComEnvio} />
            <Card>
              <h2 className="mb-4 font-display text-base font-semibold text-ink">Como funciona?</h2>
              <EssayStepper />
            </Card>
          </div>
        ) : carregando ? (
          <Card className="flex items-center justify-center py-16">
            <p className="text-sm text-muted">Carregando suas redações…</p>
          </Card>
        ) : (
          <EssayList redacoes={redacoes} vazio="Você ainda não enviou nenhuma redação." />
        )}
      </div>
    </>
  );
}

function RedacaoProfessor({ profile }: { profile: ProfileRow }) {
  const [aba, setAba] = useState<"pendentes" | "corrigidas">("pendentes");
  const [pendentes, setPendentes] = useState<EssayComNomes[]>([]);
  const [corrigidas, setCorrigidas] = useState<EssayComNomes[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [emCorrecao, setEmCorrecao] = useState<EssayComNomes | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [listaPendentes, listaCorrigidas] = await Promise.all([listarRedacoesPendentes(), listarRedacoesCorrigidas()]);
      setPendentes(listaPendentes);
      setCorrigidas(listaCorrigidas);
    } catch (erro) {
      console.error("[navehub] erro ao carregar fila de redações:", erro);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
    const canal = assinarFilaDeRedacoes(() => void recarregar());
    return () => {
      void canal.unsubscribe();
    };
  }, []);

  async function lidarComSalvarCorrecao(params: { nota: number; feedback: string }) {
    if (!emCorrecao) return;
    await corrigirRedacao({ essayId: emCorrecao.id, professorId: profile.id, nota: params.nota, feedback: params.feedback });
    setEmCorrecao(null);
    await recarregar();
  }

  return (
    <>
      <Topbar titulo="Redação" subtitulo="Fila de correção das redações enviadas pelos alunos." />
      <div className="space-y-6 p-8">
        <Abas
          ativa={aba}
          onSelecionar={(chave) => setAba(chave as "pendentes" | "corrigidas")}
          opcoes={[
            { chave: "pendentes", rotulo: `Pendentes${pendentes.length > 0 ? ` (${pendentes.length})` : ""}` },
            { chave: "corrigidas", rotulo: "Corrigidas" },
          ]}
        />

        {carregando ? (
          <Card className="flex items-center justify-center py-16">
            <p className="text-sm text-muted">Carregando…</p>
          </Card>
        ) : aba === "pendentes" ? (
          <EssayList
            redacoes={pendentes}
            mostrarNomeAluno
            vazio="Nenhuma redação pendente no momento."
            onCorrigir={setEmCorrecao}
          />
        ) : (
          <EssayList redacoes={corrigidas} mostrarNomeAluno vazio="Nenhuma redação corrigida ainda." />
        )}
      </div>

      {emCorrecao && (
        <EssayCorrectionPanel redacao={emCorrecao} onFechar={() => setEmCorrecao(null)} onSalvar={lidarComSalvarCorrecao} />
      )}
    </>
  );
}

export function RedacaoPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  return profile.papel === "professor" ? <RedacaoProfessor profile={profile} /> : <RedacaoAluno profile={profile} />;
}
