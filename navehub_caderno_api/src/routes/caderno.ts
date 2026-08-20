import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
  db,
  inserirQuestaoCaderno,
  limparQuestoesCaderno,
  registrarImportacao,
  contarQuestoesCaderno,
  type CadernoQuestaoRow,
} from "../db.js";
import {
  caminhoImagemPagina,
  DIRETORIO_IMAGENS,
  extrairPaginas,
  renderizarFiguras,
} from "../services/extrator.js";
import {
  estruturarPaginas,
  MODELO_ESGOTADO,
  type QuestaoEstruturada,
} from "../services/estruturador.js";

const DIRETORIO_UPLOADS = path.resolve(process.cwd(), "data/uploads");

interface EstadoImportacao {
  emAndamento: boolean;
  totalPaginas: number;
  progresso: number;
  resumo: string | null;
  ultimoErro: string | null;
}

export const estadoImportacao: EstadoImportacao = {
  emAndamento: false,
  totalPaginas: 0,
  progresso: 0,
  resumo: null,
  ultimoErro: null,
};

function mapearQuestao(linha: Record<string, unknown>): CadernoQuestaoRow {
  return {
    ...linha,
    alternativas: JSON.parse(linha.alternativas as string),
    arquivos: JSON.parse(linha.arquivos as string),
  } as CadernoQuestaoRow;
}

export async function cadernoRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      questoes: contarQuestoesCaderno(),
      importando: estadoImportacao.emAndamento,
      progresso: estadoImportacao.progresso,
      resumo: estadoImportacao.resumo,
    };
  });

  app.get("/importacao/status", async () => {
    return estadoImportacao;
  });

  app.post("/importar", async (requisicao, resposta) => {
    if (estadoImportacao.emAndamento) {
      return resposta.status(409).send({ error: "Já existe uma importação em andamento" });
    }

    const parte = await requisicao.file();
    if (!parte) {
      return resposta.status(400).send({ error: "Envie o arquivo PDF no campo 'pdf'" });
    }
    if (parte.mimetype !== "application/pdf" && !parte.filename.toLowerCase().endsWith(".pdf")) {
      return resposta.status(400).send({ error: "O arquivo deve ser um PDF" });
    }

    estadoImportacao.emAndamento = true;
    estadoImportacao.progresso = 0;
    estadoImportacao.resumo = null;
    estadoImportacao.ultimoErro = null;

    await fs.promises.mkdir(DIRETORIO_UPLOADS, { recursive: true });
    const nomeArquivo = `caderno-${Date.now()}.pdf`;
    const caminhoPdf = path.join(DIRETORIO_UPLOADS, nomeArquivo);

    try {
      await fs.promises.writeFile(caminhoPdf, await parte.toBuffer());

      const { paginas, digital, totalCaracteres } = await extrairPaginas(caminhoPdf);
      estadoImportacao.totalPaginas = paginas.length;

      await renderizarFiguras(caminhoPdf, paginas);

      estadoImportacao.progresso = 20;
      const resultado = await estruturarPaginas(paginas, (parcial, lote, totalLotes) => {
        estadoImportacao.progresso = Math.round(20 + (80 * lote) / totalLotes);
      });

      if (resultado.cotasEsgotadas) {
        estadoImportacao.ultimoErro = MODELO_ESGOTADO;
        return resposta.status(429).send({
          error:
            "Cota diária do Gemini esgotada durante a estruturação. Tente de novo amanhã (ou habilite billing no Google AI Studio).",
          questoesEstruturadas: resultado.questoes.length,
        });
      }

      limparQuestoesCaderno();
      for (let i = 0; i < resultado.questoes.length; i += 1) {
        const questao = resultado.questoes[i];
        inserirQuestaoCaderno({
          id: `caderno-${i + 1}`,
          materia: questao.materia,
          assunto: questao.assunto,
          titulo: questao.titulo,
          enunciado: questao.enunciado,
          introducao_alternativas: questao.introducao_alternativas,
          alternativas: questao.alternativas.map((a) => ({
            letra: a.letra,
            texto: a.texto,
            arquivo: null,
            correta: questao.gabarito === a.letra,
          })),
          arquivos: paginas.some((p) => p.numero === questao.pagina && p.temFigura)
            ? [caminhoImagemPagina(questao.pagina)]
            : [],
          gabarito: questao.gabarito,
          pagina_origem: questao.pagina,
          criado_em: new Date().toISOString(),
        });
      }

      registrarImportacao({
        arquivoOriginal: parte.filename,
        totalQuestoes: resultado.questoes.length,
        totalPaginas: paginas.length,
        digital,
      });

      estadoImportacao.resumo = `Importadas ${resultado.questoes.length} questões de ${paginas.length} páginas (${digital ? "PDF digital" : "OCR"}).`;
      return {
        ok: true,
        totalQuestoes: resultado.questoes.length,
        totalPaginas: paginas.length,
        digital,
        totalCaracteres,
        cotasEsgotadas: false,
      };
    } catch (erro) {
      estadoImportacao.ultimoErro = erro instanceof Error ? erro.message : String(erro);
      app.log.error(erro);
      return resposta.status(500).send({
        error: `Falha na importação: ${erro instanceof Error ? erro.message : String(erro)}`,
      });
    } finally {
      estadoImportacao.emAndamento = false;
      estadoImportacao.progresso = 100;
      await fs.promises.unlink(caminhoPdf).catch(() => undefined);
    }
  });

  app.get("/questoes", async (requisicao) => {
    const { materia, assunto, pagina, porPagina } =
      requisicao.query as Record<string, string | undefined>;

    const numericoPagina = Math.max(1, Number(pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(porPagina) || 20));
    const offset = (numericoPagina - 1) * limite;

    const clausulas: string[] = [];
    const parametros: Record<string, unknown> = {};

    if (materia) {
      clausulas.push("materia = @materia");
      parametros.materia = materia;
    }
    if (assunto) {
      clausulas.push("assunto = @assunto");
      parametros.assunto = assunto;
    }
    const onde = clausulas.length > 0 ? `WHERE ${clausulas.join(" AND ")}` : "";

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM questoes ${onde}`)
      .get(parametros) as { total: number };

    const linhas = db
      .prepare(
        `SELECT * FROM questoes ${onde}
         ORDER BY pagina_origem ASC, id ASC
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

  app.get("/metadados/materias", async () => {
    const linhas = db
      .prepare(
        `SELECT materia, COUNT(*) AS total FROM questoes
         GROUP BY materia ORDER BY total DESC`,
      )
      .all();
    return { materias: linhas };
  });

  app.get("/metadados/assuntos", async (requisicao) => {
    const { materia } = requisicao.query as Record<string, string | undefined>;
    const clausulas = ["assunto IS NOT NULL", "assunto != ''"];
    const parametros: Record<string, unknown> = {};
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

  // Figuras extraídas do PDF, servidas como arquivos estáticos.
  await fs.promises.mkdir(DIRETORIO_IMAGENS, { recursive: true }).catch(() => undefined);
  await app.register(import("@fastify/static").then((m) => m.default), {
    root: DIRETORIO_IMAGENS,
    prefix: "/imagens/",
    decorateReply: false,
  });
}