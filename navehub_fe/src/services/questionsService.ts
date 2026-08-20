import { chaveDiaLocal } from "@/lib/diaLocal";
import type { AreaEnem, QuestionRow } from "@/types/database.types";

/** Lista de anos oferecida no filtro quando a API ainda não respondeu. */
export const ANOS_DISPONIVEIS = Array.from(
  { length: 2023 - 2009 + 1 },
  (_, i) => 2023 - i,
);

async function buscarApi<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`/api${caminho}`);
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { error?: string } | null;
    throw new Error(corpo?.error ?? `Erro ${resposta.status} na API`);
  }
  return (await resposta.json()) as T;
}

interface ApiQuestao {
  enem_id: string;
  ano: number;
  area: AreaEnem | null;
  materia: string | null;
  assunto: string | null;
  idioma: string | null;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  alternativas: QuestionRow["alternativas"];
  arquivos: string[];
  gabarito: QuestionRow["gabarito"];
}

function mapearQuestao(api: ApiQuestao): QuestionRow {
  return {
    id: api.enem_id,
    enem_id: api.enem_id,
    ano: api.ano,
    area: api.area,
    disciplina: api.area,
    materia: api.materia,
    assunto: api.assunto,
    idioma: api.idioma,
    titulo: api.titulo,
    enunciado: api.enunciado,
    introducao_alternativas: api.introducao_alternativas,
    arquivos: api.arquivos,
    alternativas: api.alternativas,
    gabarito: api.gabarito,
    dados_originais: null,
    criado_em: "",
    atualizado_em: "",
  };
}

export interface FiltrosQuestoes {
  ano?: number | null;
  materia?: string | null;
  assunto?: string | null;
  pagina: number;
  porPagina: number;
}

export interface ResultadoQuestoes {
  questoes: QuestionRow[];
  total: number;
}

let anosDisponiveisCache: number[] | null = null;

export async function listarAnosDisponiveis(): Promise<number[]> {
  if (anosDisponiveisCache) return anosDisponiveisCache;

  try {
    const { anos } = await buscarApi<{ anos: number[] }>("/metadados/anos");
    anosDisponiveisCache = anos.length > 0 ? anos : ANOS_DISPONIVEIS;
  } catch {
    anosDisponiveisCache = ANOS_DISPONIVEIS;
  }

  return anosDisponiveisCache;
}

export async function listQuestions(
  filtros: FiltrosQuestoes,
): Promise<ResultadoQuestoes> {
  const parametros = new URLSearchParams({
    pagina: String(filtros.pagina),
    porPagina: String(filtros.porPagina),
  });
  if (filtros.ano) parametros.set("ano", String(filtros.ano));
  if (filtros.materia) parametros.set("materia", filtros.materia);
  if (filtros.assunto) parametros.set("assunto", filtros.assunto);

  const resultado = await buscarApi<{
    total: number;
    questoes: ApiQuestao[];
  }>(`/questoes?${parametros.toString()}`);

  return {
    questoes: resultado.questoes.map(mapearQuestao),
    total: resultado.total,
  };
}

export async function listarMateriasDisponiveis(): Promise<string[]> {
  const { materias } = await buscarApi<{ materias: Array<{ materia: string }> }>(
    `/metadados/materias`,
  );
  return materias.map((linha) => linha.materia).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function listarAssuntosDisponiveis(
  materia: string | null,
): Promise<string[]> {
  const consulta = materia ? `?materia=${encodeURIComponent(materia)}` : "";
  const { assuntos } = await buscarApi<{ assuntos: Array<{ assunto: string }> }>(
    `/metadados/assuntos${consulta}`,
  );
  return assuntos.map((linha) => linha.assunto);
}

export async function registrarTentativa(params: {
  alunoId: string;
  questionId: string;
  respostaDada: "A" | "B" | "C" | "D" | "E";
  correta: boolean;
}): Promise<void> {
  const resposta = await fetch("/api/tentativas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alunoId: params.alunoId,
      enemId: params.questionId,
      respostaDada: params.respostaDada,
      correta: params.correta,
    }),
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      corpo?.error ?? "Não foi possível salvar sua resposta. Tente novamente.",
    );
  }
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
  return buscarApi<EstatisticasAluno>(
    `/estatisticas?alunoId=${encodeURIComponent(alunoId)}`,
  );
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
  const { tentativas } = await buscarApi<{
    tentativas: Array<{ respondida_em: string; correta: number }>;
  }>(`/tentativas?alunoId=${encodeURIComponent(alunoId)}`);

  const porDia = new Map<string, PontoEvolucao>();

  for (const tentativa of tentativas) {
    if (!tentativa.respondida_em) continue;

    // Dia no fuso local (chaveDiaLocal) em vez de fatiar o ISO cru (UTC) —
    // sincronizado com o eixo do gráfico em EvolucaoChart.
    const dia = chaveDiaLocal(new Date(tentativa.respondida_em));
    const ponto = porDia.get(dia) ?? { dia, feitas: 0, acertos: 0 };
    ponto.feitas += 1;
    if (tentativa.correta === 1) ponto.acertos += 1;
    porDia.set(dia, ponto);
  }

  return [...porDia.values()].sort((a, b) => (a.dia < b.dia ? -1 : 1));
}