import { supabase } from "@/lib/supabaseClient";
import { chaveDiaLocal } from "@/lib/diaLocal";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

/**
 * Área selecionável no filtro de questões. Além das 4 áreas reais do ENEM,
 * inclui os idiomas estrangeiros: a API enem.dev usa o MESMO índice (ex.:
 * 2023-1) para a questão em português, espanhol e inglês — são "a mesma"
 * questão em línguas diferentes, então Inglês/Espanhol entram como opções de
 * área (a query vira { area: "linguagens", idioma: "ingles"/"espanhol" }).
 */
export type AreaFiltro = AreaEnem | "ingles" | "espanhol";

/**
 * Traduz a seleção do filtro de área em (área real, idioma) para a query:
 * - "ingles"/"espanhol" -> area=linguagens + idioma correspondente;
 * - áreas reais -> a própria área + idioma=portugues (Linguagens continua
 *   mostrando só as de português; as de idioma ficam na própria opção);
 * - vazio ("Todas") -> sem área e sem idioma (todas as línguas).
 */
export function mapearAreaFiltro(filtro: AreaFiltro | null): {
  area: AreaEnem | null;
  idioma: string | null;
} {
  if (filtro === "ingles" || filtro === "espanhol") {
    return { area: "linguagens", idioma: filtro };
  }
  return { area: filtro, idioma: filtro ? "portugues" : null };
}

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
export const ANOS_DISPONIVEIS = Array.from(
  { length: 2023 - 2009 + 1 },
  (_, i) => 2023 - i,
);

/** Anos que realmente existem no banco (sem hardcode), consultados uma vez
 *  por sessão. Usa o RPC `listar_anos_distintos` (supabase/sql/0006) — não
 *  um `select ano` com limit alto: o PostgREST do Supabase limita a resposta
 *  a 1.000 linhas/requisição, então `select ano ... limit 3000` truncava os
 *  anos antigos (o corte começava em 2018) mesmo depois de aumentar o limit.
 *  Em caso de erro, cai no fallback estático `ANOS_DISPONIVEIS`. */
let anosDisponiveisCache: number[] | null = null;

export async function listarAnosDisponiveis(): Promise<number[]> {
  if (anosDisponiveisCache) return anosDisponiveisCache;

  try {
    const { data, error } = await supabase.rpc("listar_anos_distintos");

    if (error) {
      anosDisponiveisCache = ANOS_DISPONIVEIS;
    } else {
      const anos = (data ?? []).map((linha) => linha.ano);
      anosDisponiveisCache = anos.length > 0 ? anos : ANOS_DISPONIVEIS;
    }
  } catch {
    anosDisponiveisCache = ANOS_DISPONIVEIS;
  }

  return anosDisponiveisCache;
}

export async function listQuestions(
  filtros: FiltrosQuestoes,
  opcoes?: { excluirIds?: string[] },
): Promise<ResultadoQuestoes> {
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
  if (opcoes?.excluirIds && opcoes.excluirIds.length > 0) {
    query = query.not("id", "in", `(${opcoes.excluirIds.join(",")})`);
  }

  const inicio = (filtros.pagina - 1) * filtros.porPagina;
  const fim = inicio + filtros.porPagina - 1;

  const { data, error, count } = await query
    .order("ano", { ascending: false })
    .range(inicio, fim);

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
  const { error } = await supabase.from("question_attempts").upsert(
    {
      aluno_id: params.alunoId,
      question_id: params.questionId,
      resposta_dada: params.respostaDada,
      correta: params.correta,
      respondida_em: new Date().toISOString(),
    },
    { onConflict: "aluno_id,question_id" },
  );

  if (error) {
    throw new Error(`Não foi possível salvar sua resposta: ${error.message}`);
  }
}

export async function listarIdsQuestoesRespondidas(
  alunoId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("question_attempts")
    .select("question_id")
    .eq("aluno_id", alunoId);

  if (error) {
    throw new Error(
      `Não foi possível carregar as questões respondidas: ${error.message}`,
    );
  }

  return (data ?? []).map((linha) => linha.question_id);
}

export interface QuestaoRespondida {
  questao: QuestionRow;
  /** Resposta que o aluno deu na última tentativa. */
  respostaDada: "A" | "B" | "C" | "D" | "E";
  correta: boolean;
}

/**
 * Questões que o aluno já respondeu (para revisão), com a última resposta
 * dada e o acerto. Busca via `question_attempts` com embed da questão (mesmo
 * padrão do dashboard), filtrando por ano/área/idioma da questão embutida e
 * ordenando da mais recente para a mais antiga.
 */
export async function listarQuestoesRespondidas(
  alunoId: string,
  filtros: FiltrosQuestoes,
): Promise<{ questoes: QuestaoRespondida[]; total: number }> {
  let query = supabase
    .from("question_attempts")
    .select("resposta_dada, correta, question:questions(*)")
    .eq("aluno_id", alunoId);

  if (filtros.ano) {
    query = query.eq("question.ano", filtros.ano);
  }
  if (filtros.area) {
    query = query.eq("question.area", filtros.area);
  }
  if (filtros.idioma) {
    query = query.eq("question.idioma", filtros.idioma);
  }

  const inicio = (filtros.pagina - 1) * filtros.porPagina;
  const fim = inicio + filtros.porPagina - 1;

  const { data, error, count } = await query
    .order("respondida_em", { ascending: false })
    .range(inicio, fim);

  if (error) {
    throw new Error(
      `Não foi possível carregar as questões resolvidas: ${error.message}`,
    );
  }

  const linhas = (data ?? []) as unknown as Array<{
    resposta_dada: "A" | "B" | "C" | "D" | "E";
    correta: boolean;
    question: QuestionRow | null;
  }>;

  return {
    questoes: linhas
      .filter((linha) => linha.question !== null)
      .map((linha) => ({
        questao: linha.question as QuestionRow,
        respostaDada: linha.resposta_dada,
        correta: linha.correta,
      })),
    total: count ?? 0,
  };
}

export interface EstatisticasAluno {
  questoesFeitas: number;
  percentualAcerto: number;
  desempenhoPorArea: Partial<
    Record<AreaEnem, { total: number; corretas: number; percentual: number }>
  >;
}

export async function getEstatisticasAluno(
  alunoId: string,
): Promise<EstatisticasAluno> {
  const { data, error } = await supabase
    .from("question_attempts")
    .select("correta, question:questions(area)")
    .eq("aluno_id", alunoId);

  if (error) {
    throw new Error(
      `Não foi possível carregar seu desempenho: ${error.message}`,
    );
  }

  // O tipo `Database` escrito à mão (ver src/types/database.types.ts) não
  // carrega metadados de relacionamento, então o supabase-js não consegue
  // inferir sozinho o formato do embed `question:questions(area)`. Tipamos
  // a linha explicitamente aqui, já que sabemos o formato real da resposta
  // do PostgREST para esse select.
  const linhas = (data ?? []) as unknown as Array<{
    correta: boolean;
    question: { area: AreaEnem | null } | null;
  }>;
  const desempenhoPorArea: EstatisticasAluno["desempenhoPorArea"] = {};
  let corretas = 0;

  for (const linha of linhas) {
    if (linha.correta) corretas += 1;

    const area = linha.question?.area;
    if (!area) continue;

    const atual = desempenhoPorArea[area] ?? {
      total: 0,
      corretas: 0,
      percentual: 0,
    };
    atual.total += 1;
    if (linha.correta) atual.corretas += 1;
    atual.percentual = Math.round((atual.corretas / atual.total) * 100);
    desempenhoPorArea[area] = atual;
  }

  return {
    questoesFeitas: linhas.length,
    percentualAcerto:
      linhas.length > 0 ? Math.round((corretas / linhas.length) * 100) : 0,
    desempenhoPorArea,
  };
}

export interface PontoEvolucao {
  dia: string;
  feitas: number;
  acertos: number;
}

/**
 * Série diária de questões respondidas e acertos, para o gráfico de evolução
 * do dashboard. Como o registro de tentativa é um upsert único por questão
 * (`aluno_id, question_id`), a série reflete a última resposta de cada
 * questão — consistente com o total de "questões feitas" dos cards.
 *
 * A definição de janela (7/30/90 dias) fica no componente: buscamos a
 * série completa uma única vez por sessão e o seletor de período só fatia
 * os dados no client, sem novas consultas.
 */
export async function getEvolucaoAluno(
  alunoId: string,
): Promise<PontoEvolucao[]> {
  const { data, error } = await supabase
    .from("question_attempts")
    .select("correta, respondida_em")
    .eq("aluno_id", alunoId);

  if (error) {
    throw new Error(`Não foi possível carregar sua evolução: ${error.message}`);
  }

  const linhas = (data ?? []) as unknown as Array<{
    correta: boolean;
    respondida_em: string | null;
  }>;
  const porDia = new Map<string, PontoEvolucao>();

  for (const linha of linhas) {
    if (!linha.respondida_em) continue;

    // Dia no fuso local (chaveDiaLocal) em vez de fatiar o ISO cru (UTC) —
    // sincronizado com o eixo do gráfico em EvolucaoChart.
    const dia = chaveDiaLocal(new Date(linha.respondida_em));
    const ponto = porDia.get(dia) ?? { dia, feitas: 0, acertos: 0 };
    ponto.feitas += 1;
    if (linha.correta) ponto.acertos += 1;
    porDia.set(dia, ponto);
  }

  return [...porDia.values()].sort((a, b) => (a.dia < b.dia ? -1 : 1));
}
