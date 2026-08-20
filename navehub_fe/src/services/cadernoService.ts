import type { QuestionRow } from "@/types/database.types";

export interface EstadoImportacao {
  emAndamento: boolean;
  totalPaginas: number;
  progresso: number;
  resumo: string | null;
  ultimoErro: string | null;
}

export interface ResultadoImportacao {
  ok: boolean;
  totalQuestoes: number;
  totalPaginas: number;
  digital: boolean;
  cotasEsgotadas: boolean;
}

async function buscarApi<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`/caderno-api${caminho}`);
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { error?: string } | null;
    throw new Error(corpo?.error ?? `Erro ${resposta.status} na API do caderno`);
  }
  return (await resposta.json()) as T;
}

export async function importarCaderno(arquivo: File): Promise<ResultadoImportacao> {
  const corpo = new FormData();
  corpo.append("pdf", arquivo);

  const resposta = await fetch("/caderno-api/importar", {
    method: "POST",
    body: corpo,
  });

  const dados = (await resposta.json().catch(() => null)) as
    | (ResultadoImportacao & { error?: string })
    | null;

  if (!resposta.ok) {
    throw new Error(
      dados?.error ?? `Falha na importação (${resposta.status}). Tente novamente.`,
    );
  }
  return dados as ResultadoImportacao;
}

export async function consultarStatusImportacao(): Promise<EstadoImportacao> {
  return buscarApi<EstadoImportacao>("/importacao/status");
}

export interface CadernoQuestao {
  id: string;
  materia: string;
  assunto: string;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  alternativas: QuestionRow["alternativas"];
  arquivos: string[];
  gabarito: "A" | "B" | "C" | "D" | "E" | null;
  pagina_origem: number;
}

export interface ResultadoQuestoesCaderno {
  total: number;
  pagina: number;
  porPagina: number;
  questoes: CadernoQuestao[];
}

export async function listarQuestoesCaderno(params: {
  materia?: string | null;
  assunto?: string | null;
  pagina?: number;
  porPagina?: number;
}): Promise<ResultadoQuestoesCaderno> {
  const busca = new URLSearchParams({
    pagina: String(params.pagina ?? 1),
    porPagina: String(params.porPagina ?? 20),
  });
  if (params.materia) busca.set("materia", params.materia);
  if (params.assunto) busca.set("assunto", params.assunto);
  return buscarApi<ResultadoQuestoesCaderno>(`/questoes?${busca.toString()}`);
}

export async function listarMateriasCaderno(): Promise<string[]> {
  const { materias } = await buscarApi<{ materias: Array<{ materia: string }> }>(
    "/metadados/materias",
  );
  return materias.map((linha) => linha.materia);
}

export async function listarAssuntosCaderno(materia: string | null): Promise<string[]> {
  const consulta = materia ? `?materia=${encodeURIComponent(materia)}` : "";
  const { assuntos } = await buscarApi<{ assuntos: Array<{ assunto: string }> }>(
    `/metadados/assuntos${consulta}`,
  );
  return assuntos.map((linha) => linha.assunto);
}