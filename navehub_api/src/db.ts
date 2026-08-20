import "dotenv/config";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));
const caminhoBanco = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(diretorioAtual, "../data/navehub.db");

export const db = new Database(caminhoBanco);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export type AreaEnem =
  | "matematica"
  | "linguagens"
  | "ciencias_humanas"
  | "ciencias_natureza";

export interface TentativaRow {
  aluno_id: string;
  enem_id: string;
  resposta_dada: "A" | "B" | "C" | "D" | "E";
  correta: number;
  respondida_em: string;
  /** Colunas da questão juntadas na consulta (só em listagens). */
  area?: string | null;
  materia?: string | null;
  assunto?: string | null;
}

export interface QuestaoRow {
  enem_id: string;
  ano: number;
  area: AreaEnem | null;
  materia: string | null;
  assunto: string | null;
  idioma: string | null;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  alternativas: unknown;
  arquivos: string[];
  gabarito: "A" | "B" | "C" | "D" | "E";
  classificada_em: string | null;
  criado_em: string;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS questoes (
    enem_id TEXT PRIMARY KEY,
    ano INTEGER NOT NULL,
    area TEXT,
    materia TEXT,
    assunto TEXT,
    idioma TEXT,
    titulo TEXT NOT NULL,
    enunciado TEXT,
    introducao_alternativas TEXT,
    alternativas TEXT NOT NULL,
    arquivos TEXT NOT NULL,
    gabarito TEXT NOT NULL,
    classificada_em TEXT,
    criado_em TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_questoes_ano ON questoes(ano);
  CREATE INDEX IF NOT EXISTS idx_questoes_area ON questoes(area);
  CREATE INDEX IF NOT EXISTS idx_questoes_materia ON questoes(materia);
  CREATE INDEX IF NOT EXISTS idx_questoes_assunto ON questoes(assunto);
  CREATE INDEX IF NOT EXISTS idx_questoes_idioma ON questoes(idioma);

  CREATE TABLE IF NOT EXISTS tentativas (
    aluno_id TEXT NOT NULL,
    enem_id TEXT NOT NULL,
    resposta_dada TEXT NOT NULL,
    correta INTEGER NOT NULL,
    respondida_em TEXT NOT NULL,
    PRIMARY KEY (aluno_id, enem_id)
  );

  CREATE INDEX IF NOT EXISTS idx_tentativas_aluno ON tentativas(aluno_id);
`);

export function inserirQuestao(questao: QuestaoRow): void {
  db.prepare(
    `INSERT INTO questoes (enem_id, ano, area, materia, assunto, idioma, titulo,
       enunciado, introducao_alternativas, alternativas, arquivos, gabarito,
       classificada_em, criado_em)
     VALUES (@enem_id, @ano, @area, @materia, @assunto, @idioma, @titulo,
       @enunciado, @introducao_alternativas, @alternativas, @arquivos, @gabarito,
       @classificada_em, @criado_em)
     ON CONFLICT(enem_id) DO UPDATE SET
       ano = excluded.ano,
       area = excluded.area,
       materia = COALESCE(excluded.materia, questoes.materia),
       assunto = COALESCE(excluded.assunto, questoes.assunto),
       idioma = excluded.idioma,
       titulo = excluded.titulo,
       enunciado = excluded.enunciado,
       introducao_alternativas = excluded.introducao_alternativas,
       alternativas = excluded.alternativas,
       arquivos = excluded.arquivos,
       gabarito = excluded.gabarito,
       classificada_em = COALESCE(excluded.classificada_em, questoes.classificada_em),
       criado_em = questoes.criado_em`,
  ).run({
    ...questao,
    alternativas: JSON.stringify(questao.alternativas),
    arquivos: JSON.stringify(questao.arquivos),
  });
}

export function marcarClassificacao(
  ano: number,
  index: number,
  materia: string,
  assunto: string,
): void {
  db.prepare(
    `UPDATE questoes SET materia = ?, assunto = ?, classificada_em = ?
     WHERE enem_id LIKE ?`,
  ).run(materia, assunto, new Date().toISOString(), `${ano}-${index}-%`);
}

export function contarClassificadas(): number {
  return (
    db
      .prepare(`SELECT COUNT(*) AS total FROM questoes WHERE classificada_em IS NOT NULL`)
      .get() as { total: number }
  ).total;
}

export function contarTotais(): { total: number; classificadas: number; semAssunto: number } {
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM questoes`).get() as { total: number };
  const classificadas = contarClassificadas();
  return { total, classificadas, semAssunto: total - classificadas };
}

export function registrarTentativa(
  alunoId: string,
  enemId: string,
  respostaDada: TentativaRow["resposta_dada"],
  correta: boolean,
): void {
  db.prepare(
    `INSERT INTO tentativas (aluno_id, enem_id, resposta_dada, correta, respondida_em)
     VALUES (@aluno_id, @enem_id, @resposta_dada, @correta, @respondida_em)
     ON CONFLICT(aluno_id, enem_id) DO UPDATE SET
       resposta_dada = excluded.resposta_dada,
       correta = excluded.correta,
       respondida_em = excluded.respondida_em`,
  ).run({
    aluno_id: alunoId,
    enem_id: enemId,
    resposta_dada: respostaDada,
    correta: correta ? 1 : 0,
    respondida_em: new Date().toISOString(),
  });
}

export function listarTentativas(alunoId: string): TentativaRow[] {
  return db
    .prepare(
      `SELECT t.*, q.area, q.materia, q.assunto
       FROM tentativas t
       JOIN questoes q ON q.enem_id = t.enem_id
       WHERE t.aluno_id = ?
       ORDER BY t.respondida_em ASC`,
    )
    .all(alunoId) as TentativaRow[];
}

export function listarAnosDistintos(): number[] {
  const linhas = db
    .prepare(`SELECT DISTINCT ano FROM questoes ORDER BY ano DESC`)
    .all() as Array<{ ano: number }>;
  return linhas.map((linha) => linha.ano);
}