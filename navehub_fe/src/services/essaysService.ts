import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { EssayRow } from "@/types/database.types";

export interface EssayComNomes extends EssayRow {
  aluno: { nome: string } | null;
  professor: { nome: string } | null;
}

const SELECT_COM_NOMES = "*, aluno:profiles!aluno_id(nome), professor:profiles!professor_id(nome)";

function comoEssayComNomes(linhas: unknown): EssayComNomes[] {
  // Mesmo caso do serviço de questões: o embed de duas FKs para `profiles`
  // (aluno_id e professor_id) precisa ser desambiguado na query
  // (`profiles!aluno_id`, `profiles!professor_id`), e o tipo `Database`
  // escrito à mão não carrega essa metainformação para o TS inferir
  // sozinho — por isso o cast explícito aqui.
  return (linhas ?? []) as EssayComNomes[];
}

export async function enviarRedacao(params: { alunoId: string; tema: string; texto: string }): Promise<void> {
  const { error } = await supabase.from("essays").insert({
    aluno_id: params.alunoId,
    tema: params.tema,
    texto: params.texto,
  });

  if (error) {
    throw new Error(`Não foi possível enviar sua redação: ${error.message}`);
  }
}

export async function listarMinhasRedacoes(alunoId: string): Promise<EssayComNomes[]> {
  const { data, error } = await supabase
    .from("essays")
    .select(SELECT_COM_NOMES)
    .eq("aluno_id", alunoId)
    .order("enviada_em", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar suas redações: ${error.message}`);
  }

  return comoEssayComNomes(data);
}

export async function listarRedacoesPendentes(): Promise<EssayComNomes[]> {
  const { data, error } = await supabase
    .from("essays")
    .select(SELECT_COM_NOMES)
    .eq("status", "pendente")
    .order("enviada_em", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar a fila de redações: ${error.message}`);
  }

  return comoEssayComNomes(data);
}

export async function listarRedacoesCorrigidas(): Promise<EssayComNomes[]> {
  const { data, error } = await supabase
    .from("essays")
    .select(SELECT_COM_NOMES)
    .eq("status", "corrigida")
    .order("corrigida_em", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar as redações corrigidas: ${error.message}`);
  }

  return comoEssayComNomes(data);
}

export async function corrigirRedacao(params: {
  essayId: string;
  professorId: string;
  nota: number;
  feedback: string;
}): Promise<void> {
  const { error } = await supabase
    .from("essays")
    .update({
      status: "corrigida",
      nota: params.nota,
      feedback: params.feedback,
      professor_id: params.professorId,
      corrigida_em: new Date().toISOString(),
    })
    .eq("id", params.essayId);

  if (error) {
    throw new Error(`Não foi possível salvar a correção: ${error.message}`);
  }
}

/**
 * Assina mudanças nas redações do próprio aluno via Supabase Realtime — é
 * assim que "Minhas redações" atualiza sozinha quando o professor corrige,
 * sem polling e sem e-mail (decisão registrada no planejamento).
 */
export function assinarMinhasRedacoes(alunoId: string, aoMudar: () => void): RealtimeChannel {
  return supabase
    .channel(`essays-aluno-${alunoId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "essays", filter: `aluno_id=eq.${alunoId}` },
      aoMudar
    )
    .subscribe();
}

/** Assina mudanças em toda a fila de redações — usado na tela do professor. */
export function assinarFilaDeRedacoes(aoMudar: () => void): RealtimeChannel {
  return supabase
    .channel("essays-fila-professor")
    .on("postgres_changes", { event: "*", schema: "public", table: "essays" }, aoMudar)
    .subscribe();
}
