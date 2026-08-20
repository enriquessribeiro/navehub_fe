import type { FastifyInstance } from "fastify";
import {
  db,
  listarAnosDistintos,
  listarTentativas,
  registrarTentativa,
  type AreaEnem,
} from "../db.js";

const AREAS_VALIDAS = new Set([
  "matematica",
  "linguagens",
  "ciencias_humanas",
  "ciencias_natureza",
]);

interface CorpoTentativa {
  alunoId?: string;
  enemId?: string;
  respostaDada?: string;
  correta?: boolean;
}

export async function tentativasRoutes(app: FastifyInstance): Promise<void> {
  app.post("/tentativas", async (requisicao, resposta) => {
    const corpo = requisicao.body as CorpoTentativa | null;
    const alunoId = corpo?.alunoId?.trim();
    const enemId = corpo?.enemId?.trim();
    const respostaDada = corpo?.respostaDada?.trim().toUpperCase();

    if (!alunoId || !enemId) {
      return resposta.status(400).send({ error: "alunoId e enemId são obrigatórios" });
    }
    if (!respostaDada || !["A", "B", "C", "D", "E"].includes(respostaDada)) {
      return resposta.status(400).send({ error: "respostaDada deve ser A, B, C, D ou E" });
    }
    if (typeof corpo?.correta !== "boolean") {
      return resposta.status(400).send({ error: "correta deve ser booleano" });
    }

    const existe = db.prepare(`SELECT 1 FROM questoes WHERE enem_id = ?`).get(enemId);
    if (!existe) {
      return resposta.status(404).send({ error: "Questão não encontrada" });
    }

    registrarTentativa(
      alunoId,
      enemId,
      respostaDada as "A" | "B" | "C" | "D" | "E",
      corpo.correta,
    );
    return { ok: true };
  });

  app.get("/tentativas", async (requisicao, resposta) => {
    const { alunoId } = requisicao.query as Record<string, string | undefined>;
    if (!alunoId) {
      return resposta.status(400).send({ error: "alunoId é obrigatório" });
    }
    return { tentativas: listarTentativas(alunoId) };
  });

  app.get("/estatisticas", async (requisicao, resposta) => {
    const { alunoId } = requisicao.query as Record<string, string | undefined>;
    if (!alunoId) {
      return resposta.status(400).send({ error: "alunoId é obrigatório" });
    }

    const tentativas = listarTentativas(alunoId);
    const desempenhoPorArea: Partial<
      Record<AreaEnem, { total: number; corretas: number; percentual: number }>
    > = {};
    let corretas = 0;

    for (const tentativa of tentativas) {
      if (tentativa.correta === 1) corretas += 1;
      const area = tentativa.area as AreaEnem | null | undefined;
      if (!area || !AREAS_VALIDAS.has(area)) continue;

      const atual = desempenhoPorArea[area] ?? {
        total: 0,
        corretas: 0,
        percentual: 0,
      };
      atual.total += 1;
      if (tentativa.correta === 1) atual.corretas += 1;
      atual.percentual = Math.round((atual.corretas / atual.total) * 100);
      desempenhoPorArea[area] = atual;
    }

    return {
      questoesFeitas: tentativas.length,
      percentualAcerto:
        tentativas.length > 0 ? Math.round((corretas / tentativas.length) * 100) : 0,
      desempenhoPorArea,
    };
  });

  app.get("/metadados/anos", async () => {
    return { anos: listarAnosDistintos() };
  });
}