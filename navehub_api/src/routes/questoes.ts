import type { FastifyInstance } from "fastify";
import { db, type QuestaoRow } from "../db.js";

const AREAS_VALIDAS = new Set([
  "matematica",
  "linguagens",
  "ciencias_humanas",
  "ciencias_natureza",
]);

interface AlternativaBruta {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string | null;
  file: string | null;
  isCorrect: boolean;
}

function mapearQuestao(linha: Record<string, unknown>): QuestaoRow {
  const alternativasBrutas = JSON.parse(linha.alternativas as string) as AlternativaBruta[];
  return {
    ...linha,
    alternativas: alternativasBrutas.map((alternativa) => ({
      letra: alternativa.letter,
      texto: alternativa.text,
      arquivo: alternativa.file,
      correta: alternativa.isCorrect,
    })),
    arquivos: JSON.parse(linha.arquivos as string),
  } as QuestaoRow;
}

export async function questoesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    const { total, classificadas } = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM questoes) AS total,
           (SELECT COUNT(*) FROM questoes WHERE classificada_em IS NOT NULL) AS classificadas`,
      )
      .get() as { total: number; classificadas: number };
    return {
      status: "ok",
      questoes: total,
      classificadas,
      semAssunto: total - classificadas,
    };
  });

  app.get("/questoes", async (requisicao) => {
    const { ano, area, materia, assunto, idioma, pagina, porPagina } =
      requisicao.query as Record<string, string | undefined>;

    const numericoPagina = Math.max(1, Number(pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(porPagina) || 20));
    const offset = (numericoPagina - 1) * limite;

    const clausulas: string[] = [];
    const parametros: Record<string, unknown> = {};

    if (ano) {
      clausulas.push("ano = @ano");
      parametros.ano = Number(ano);
    }
    if (area && AREAS_VALIDAS.has(area)) {
      clausulas.push("area = @area");
      parametros.area = area;
    }
    if (materia) {
      clausulas.push("materia = @materia");
      parametros.materia = materia;
    }
    if (assunto) {
      clausulas.push("assunto = @assunto");
      parametros.assunto = assunto;
    }
    if (idioma) {
      clausulas.push("idioma = @idioma");
      parametros.idioma = idioma;
    }

    const onde = clausulas.length > 0 ? `WHERE ${clausulas.join(" AND ")}` : "";

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM questoes ${onde}`)
      .get(parametros) as { total: number };

    const linhas = db
      .prepare(
        `SELECT * FROM questoes ${onde}
         ORDER BY ano DESC, enem_id ASC
         LIMIT @limite OFFSET @offset`,
      )
      .all({ ...parametros, limite, offset }) as Record<string, unknown>[];

    return {
      total,
      pagina: numericoPagina,
      porPagina: limite,
      questoes: linhas.map(mapearQuestao),
    };
  });

  app.get("/questoes/:enemId", async (requisicao, resposta) => {
    const { enemId } = requisicao.params as { enemId: string };
    const linha = db.prepare(`SELECT * FROM questoes WHERE enem_id = ?`).get(enemId);
    if (!linha) {
      return resposta.status(404).send({ error: "Questão não encontrada" });
    }
    return mapearQuestao(linha as Record<string, unknown>);
  });

  app.get("/metadados/areas", async () => {
    const linhas = db
      .prepare(
        `SELECT area, COUNT(*) AS total FROM questoes
         WHERE area IS NOT NULL GROUP BY area ORDER BY total DESC`,
      )
      .all();
    return { areas: linhas };
  });

  app.get("/metadados/materias", async (requisicao) => {
    const { area } = requisicao.query as Record<string, string | undefined>;
    const clausulas = ["materia IS NOT NULL", "materia != ''"];
    const parametros: Record<string, unknown> = {};
    if (area && AREAS_VALIDAS.has(area)) {
      clausulas.push("area = @area");
      parametros.area = area;
    }
    const linhas = db
      .prepare(
        `SELECT materia, COUNT(*) AS total FROM questoes
         WHERE ${clausulas.join(" AND ")}
         GROUP BY materia ORDER BY materia ASC`,
      )
      .all(parametros);
    return { materias: linhas };
  });

  app.get("/metadados/assuntos", async (requisicao) => {
    const { area, materia } = requisicao.query as Record<string, string | undefined>;
    const clausulas = ["assunto IS NOT NULL", "assunto != ''"];
    const parametros: Record<string, unknown> = {};
    if (area && AREAS_VALIDAS.has(area)) {
      clausulas.push("area = @area");
      parametros.area = area;
    }
    if (materia) {
      clausulas.push("materia = @materia");
      parametros.materia = materia;
    }
    const linhas = db
      .prepare(
        `SELECT assunto, COUNT(*) AS total FROM questoes
         WHERE ${clausulas.join(" AND ")}
         GROUP BY assunto ORDER BY total DESC`,
      )
      .all(parametros);
    return { assuntos: linhas };
  });
}