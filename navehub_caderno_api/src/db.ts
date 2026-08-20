import "dotenv/config";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));
const caminhoBanco = process.env.CADERNO_DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.CADERNO_DATABASE_PATH)
  : path.resolve(diretorioAtual, "../data/caderno.db");

export const db = new Database(caminhoBanco);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export interface CadernoQuestaoRow {
  id: string;
  materia: string;
  assunto: string;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  alternativas: unknown;
  arquivos: string[];
  gabarito: "A" | "B" | "C" | "D" | "E" | null;
  pagina_origem: number;
  criado_em: string;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS questoes (
    id TEXT PRIMARY KEY,
    materia TEXT NOT NULL,
    assunto TEXT NOT NULL,
    titulo TEXT NOT NULL,
    enunciado TEXT,
    introducao_alternativas TEXT,
    alternativas TEXT NOT NULL,
    arquivos TEXT NOT NULL,
    gabarito TEXT,
    pagina_origem INTEGER NOT NULL,
    criado_em TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_caderno_materia ON questoes(materia);
  CREATE INDEX IF NOT EXISTS idx_caderno_assunto ON questoes(assunto);

  CREATE TABLE IF NOT EXISTS importacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo_original TEXT NOT NULL,
    total_questoes INTEGER NOT NULL,
    total_paginas INTEGER NOT NULL,
    digital INTEGER NOT NULL,
    importada_em TEXT NOT NULL
  );
`);

export function inserirQuestaoCaderno(questao: CadernoQuestaoRow): void {
  db.prepare(
    `INSERT INTO questoes (id, materia, assunto, titulo, enunciado,
       introducao_alternativas, alternativas, arquivos, gabarito, pagina_origem, criado_em)
     VALUES (@id, @materia, @assunto, @titulo, @enunciado,
       @introducao_alternativas, @alternativas, @arquivos, @gabarito, @pagina_origem, @criado_em)
     ON CONFLICT(id) DO UPDATE SET
       materia = excluded.materia,
       assunto = excluded.assunto,
       titulo = excluded.titulo,
       enunciado = excluded.enunciado,
       introducao_alternativas = excluded.introducao_alternativas,
       alternativas = excluded.alternativas,
       arquivos = excluded.arquivos,
       gabarito = excluded.gabarito,
       pagina_origem = excluded.pagina_origem`,
  ).run({
    ...questao,
    alternativas: JSON.stringify(questao.alternativas),
    arquivos: JSON.stringify(questao.arquivos),
  });
}

export function limparQuestoesCaderno(): void {
  db.prepare(`DELETE FROM questoes`).run();
}

export function registrarImportacao(params: {
  arquivoOriginal: string;
  totalQuestoes: number;
  totalPaginas: number;
  digital: boolean;
}): void {
  db.prepare(
    `INSERT INTO importacoes (arquivo_original, total_questoes, total_paginas, digital, importada_em)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    params.arquivoOriginal,
    params.totalQuestoes,
    params.totalPaginas,
    params.digital ? 1 : 0,
    new Date().toISOString(),
  );
}

export function contarQuestoesCaderno(): number {
  return (
    db.prepare(`SELECT COUNT(*) AS total FROM questoes`).get() as { total: number }
  ).total;
}