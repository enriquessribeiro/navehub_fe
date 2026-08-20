import type { AreaEnem } from "../db.js";

const BASE = "https://api.enem.dev/v1";
const POR_PAGINA = 50;

export interface EnemAlternativa {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string | null;
  file: string | null;
  isCorrect: boolean;
}

export interface EnemQuestao {
  title: string;
  index: number;
  discipline: string | null;
  language: string | null;
  year: number;
  context: string | null;
  files: string[];
  correctAlternative: "A" | "B" | "C" | "D" | "E";
  alternativesIntroduction: string | null;
  alternatives: EnemAlternativa[];
}

export interface PaginaQuestoes {
  questoes: EnemQuestao[];
  total: number;
}

/** Traduz o slug de disciplina da enem.dev para a área ENEM usada no app. */
export function mapearArea(discipline: string | null): AreaEnem | null {
  switch (discipline) {
    case "matematica":
      return "matematica";
    case "linguagens":
      return "linguagens";
    case "ciencias-humanas":
      return "ciencias_humanas";
    case "ciencias-natureza":
      return "ciencias_natureza";
    default:
      return null;
  }
}

const TENTATIVAS = 6;
const PAUSA_INICIAL_MS = 2000;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function buscar<T>(caminho: string): Promise<T> {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    const resposta = await fetch(`${BASE}${caminho}`);
    if (resposta.ok) {
      return (await resposta.json()) as T;
    }

    const pausa = PAUSA_INICIAL_MS * 2 ** (tentativa - 1);
    console.warn(
      `enem.dev ${caminho}: HTTP ${resposta.status} — tentativa ${tentativa}/${TENTATIVAS}, aguardando ${pausa}ms`,
    );
    await aguardar(pausa);
  }
  throw new Error(`enem.dev ${caminho}: falhou após ${TENTATIVAS} tentativas`);
}

/** Anos de prova disponíveis na enem.dev (ex.: ENEM 2023, 2022, ...). */
export async function listarProvas(): Promise<number[]> {
  const provas = await buscar<Array<{ year: number }>>("/exams");
  return provas.map((prova) => prova.year).sort((a, b) => b - a);
}

export async function listarQuestoesDoAno(
  ano: number,
  offset: number,
  limite = POR_PAGINA,
): Promise<PaginaQuestoes> {
  const dados = await buscar<{
    metadata: { total: number };
    questions: EnemQuestao[];
  }>(`/exams/${ano}/questions?limit=${limite}&offset=${offset}`);
  return { questoes: dados.questions, total: dados.metadata.total };
}