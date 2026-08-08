import { supabase } from "@/lib/supabaseClient";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

export interface FiltrosQuestoes {
  ano?: number | null;
  area?: AreaEnem | null;
  idioma?: string | null;
  pagina: number;
  porPagina: number;
}

export interface ResultadoQuestoes {
  questoes: QuestionRow[];
  total: number;
}

/**
 * Lista de anos oferecida no filtro. Idealmente viria de uma consulta
 * agregada (`SELECT DISTINCT ano`) — para o MVP, usamos a faixa de anos que
 * a própria documentação do enem.dev diz cobrir (2009–2023), o que evita
 * uma consulta extra só para popular um <select>. Quando o volume de dados
 * justificar, trocar por uma função/RPC de anos distintos é uma melhoria
 * simples.
 */
export const ANOS_DISPONIVEIS = Array.from({ length: 2023 - 2009 + 1 }, (_, i) => 2023 - i);

export async function listQuestions(filtros: FiltrosQuestoes): Promise<ResultadoQuestoes> {
  let query = supabase.from("questions").select("*", { count: "exact" });

  if (filtros.ano) {
    query = query.eq("ano", filtros.ano);
  }
  if (filtros.area) {
    query = query.eq("area", filtros.area);
  }
  if (filtros.idioma) {
    query = query.eq("idioma", filtros.idioma);
  }

  const inicio = (filtros.pagina - 1) * filtros.porPagina;
  const fim = inicio + filtros.porPagina - 1;

  const { data, error, count } = await query.order("ano", { ascending: false }).range(inicio, fim);

  if (error) {
    throw new Error(`Não foi possível carregar as questões: ${error.message}`);
  }

  return { questoes: data ?? [], total: count ?? 0 };
}

export async function registrarTentativa(params: {
  alunoId: string;
  questionId: string;
  respostaDada: "A" | "B" | "C" | "D" | "E";
  correta: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("question_attempts")
    .upsert(
      {
        aluno_id: params.alunoId,
        question_id: params.questionId,
        resposta_dada: params.respostaDada,
        correta: params.correta,
      },
      { onConflict: "aluno_id,question_id" }
    );

  if (error) {
    throw new Error(`Não foi possível salvar sua resposta: ${error.message}`);
  }
}

export interface EstatisticasAluno {
  questoesFeitas: number;
  percentualAcerto: number;
  desempenhoPorArea: Partial<Record<AreaEnem, { total: number; corretas: number; percentual: number }>>;
}

export async function getEstatisticasAluno(alunoId: string): Promise<EstatisticasAluno> {
  const { data, error } = await supabase
    .from("question_attempts")
    .select("correta, question:questions(area)")
    .eq("aluno_id", alunoId);

  if (error) {
    throw new Error(`Não foi possível carregar seu desempenho: ${error.message}`);
  }

  // O tipo `Database` escrito à mão (ver src/types/database.types.ts) não
  // carrega metadados de relacionamento, então o supabase-js não consegue
  // inferir sozinho o formato do embed `question:questions(area)`. Tipamos
  // a linha explicitamente aqui, já que sabemos o formato real da resposta
  // do PostgREST para esse select.
  const linhas = (data ?? []) as unknown as Array<{ correta: boolean; question: { area: AreaEnem | null } | null }>;
  const desempenhoPorArea: EstatisticasAluno["desempenhoPorArea"] = {};
  let corretas = 0;

  for (const linha of linhas) {
    if (linha.correta) corretas += 1;

    const area = linha.question?.area;
    if (!area) continue;

    const atual = desempenhoPorArea[area] ?? { total: 0, corretas: 0, percentual: 0 };
    atual.total += 1;
    if (linha.correta) atual.corretas += 1;
    atual.percentual = Math.round((atual.corretas / atual.total) * 100);
    desempenhoPorArea[area] = atual;
  }

  return {
    questoesFeitas: linhas.length,
    percentualAcerto: linhas.length > 0 ? Math.round((corretas / linhas.length) * 100) : 0,
    desempenhoPorArea,
  };
}
