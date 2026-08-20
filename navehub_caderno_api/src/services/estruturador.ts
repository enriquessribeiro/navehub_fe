import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PaginaExtraida } from "./extrator.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Faltando GEMINI_API_KEY no .env");
  process.exit(1);
}

export const MODELO_ESGOTADO = "COTA_DIARIA_ESGOTADA";

/**
 * Modelos usados na estruturação. A cota grátis do Gemini é de 20
 * requisições/dia POR MODELO, então rotacionamos entre vários modelos flash
 * para estruturar tudo sem custo. Ao esgotar um modelo (429/quota), o
 * próximo da lista assume automaticamente.
 */
const MODELOS_PADRAO = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-3.7-flash",
];

export const MODELOS_DISPONIVEIS = (
  process.env.GEMINI_MODELS ?? MODELOS_PADRAO.join(",")
)
  .split(",")
  .map((nome) => nome.trim())
  .filter(Boolean);

const client = new GoogleGenerativeAI(apiKey);

let indiceModelo = 0;

function cotaEsgotada(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return mensagem.includes("429") || /quota/i.test(mensagem);
}

async function gerarTextoComRotacao(prompt: string): Promise<string> {
  const totalModelos = MODELOS_DISPONIVEIS.length;
  for (let tentativa = 0; tentativa < totalModelos; tentativa += 1) {
    const nome = MODELOS_DISPONIVEIS[indiceModelo];
    try {
      const resultado = await client
        .getGenerativeModel({
          model: nome,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })
        .generateContent(prompt);
      return resultado.response.text();
    } catch (erro) {
      indiceModelo = (indiceModelo + 1) % totalModelos;
      if (cotaEsgotada(erro)) {
        console.warn(`  cota do ${nome} esgotada — próximo modelo: ${MODELOS_DISPONIVEIS[indiceModelo]}`);
        continue;
      }
      throw erro;
    }
  }
  throw new Error(MODELO_ESGOTADO);
}

export interface AlternativaEstruturada {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string;
}

export interface QuestaoEstruturada {
  materia: string;
  assunto: string;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  alternativas: AlternativaEstruturada[];
  gabarito: "A" | "B" | "C" | "D" | "E" | null;
  pagina: number;
}

export const TAMANHO_LOTE_PAGINAS = 5;

function montarPrompt(paginas: PaginaExtraida[]): string {
  const blocos = paginas
    .map(
      (pagina) =>
        `--- PÁGINA ${pagina.numero} ---\n${pagina.texto.trim().slice(0, 6000)}`,
    )
    .join("\n\n");

  return `Você é um especialista em questões de vestibular. O texto abaixo é a extração de páginas de um CADERNO de questões já organizado por matéria e assunto.

Extraia TODAS as questões de estudo presentes no texto. Para cada questão:
- materia: a matéria da seção onde a questão está (ex.: Matemática, Biologia, Física, Química, História, Geografia, Português, Literatura, Filosofia, Sociologia, Artes).
- assunto: o tópico específico dentro da matéria indicado na seção (ex.: Probabilidade, Genética, Mecânica, Interpretação de Texto).
- enunciado: o texto completo da questão (sem as alternativas), mantendo figuras referenciadas como texto entre colchetes, ex.: [FIGURA].
- introducao_alternativas: se houver um comando antes das alternativas (ex.: "Assinale a alternativa correta:"), use-o; senão null.
- alternativas: lista com letra (A a E) e texto de cada opção. Se não houver alternativas, use lista vazia.
- gabarito: a letra da resposta correta SE o caderno indicar (ex.: "GABARITO: C", "Resposta: C"); senão null.
- pagina: número da página onde a questão começa.

Regras:
- Não pule questões e não invente conteúdo que não esteja no texto.
- Ignore sumários, capas e textos de instrução que não sejam questões.
- Separe questões diferentes mesmo que estejam na mesma página.

Responda SOMENTE com JSON neste formato (sem markdown):
{"questoes":[{"materia":"...","assunto":"...","enunciado":"...","introducao_alternativas":"...","alternativas":[{"letra":"A","texto":"..."}],"gabarito":"B","pagina":3}]}

Texto:
${blocos}`;
}

export interface ResultadoEstruturacao {
  questoes: QuestaoEstruturada[];
  cotasEsgotadas: boolean;
}

export async function estruturarPaginas(
  paginas: PaginaExtraida[],
  onLote?: (parcial: QuestaoEstruturada[], lote: number, totalLotes: number) => void,
): Promise<ResultadoEstruturacao> {
  const lotes: PaginaExtraida[][] = [];
  for (let i = 0; i < paginas.length; i += TAMANHO_LOTE_PAGINAS) {
    lotes.push(paginas.slice(i, i + TAMANHO_LOTE_PAGINAS));
  }

  const questoes: QuestaoEstruturada[] = [];
  let cotasEsgotadas = false;

  for (let loteIndex = 0; loteIndex < lotes.length; loteIndex += 1) {
    try {
      const texto = await gerarTextoComRotacao(montarPrompt(lotes[loteIndex]));
      const cru = JSON.parse(texto) as {
        questoes?: Array<{
          materia?: string;
          assunto?: string;
          titulo?: string;
          enunciado?: string;
          introducao_alternativas?: string | null;
          alternativas?: AlternativaEstruturada[];
          gabarito?: string | null;
          pagina?: number;
        }>;
      };

      if (!Array.isArray(cru.questoes)) {
        console.warn(`  lote ${loteIndex + 1}/${lotes.length}: resposta sem o array questoes`);
        continue;
      }

      const paginaInicial = lotes[loteIndex][0].numero;
      for (const item of cru.questoes) {
        if (!item.enunciado && (!item.alternativas || item.alternativas.length === 0)) continue;
        const letrasValidas = ["A", "B", "C", "D", "E"];
        const gabarito =
          item.gabarito && letrasValidas.includes(item.gabarito.toUpperCase())
            ? (item.gabarito.toUpperCase() as "A" | "B" | "C" | "D" | "E")
            : null;
        questoes.push({
          materia: (item.materia ?? "").trim() || "Geral",
          assunto: (item.assunto ?? "").trim() || "Geral",
          titulo: (item.titulo ?? "").trim() || `Questão do caderno`,
          enunciado: item.enunciado?.trim() || null,
          introducao_alternativas: item.introducao_alternativas?.trim() || null,
          alternativas: (item.alternativas ?? []).filter(
            (a) => letrasValidas.includes(a.letra) && a.texto?.trim(),
          ),
          gabarito,
          pagina: typeof item.pagina === "number" && item.pagina >= paginaInicial
            ? item.pagina
            : paginaInicial,
        });
      }
      onLote?.(questoes, loteIndex + 1, lotes.length);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      if (mensagem === MODELO_ESGOTADO || /quota/i.test(mensagem) || mensagem.includes("429")) {
        console.error(`  cota do Gemini esgotada no lote ${loteIndex + 1}/${lotes.length} — interrompendo.`);
        cotasEsgotadas = true;
        break;
      }
      console.error(
        `  lote ${loteIndex + 1}/${lotes.length} falhou: ${mensagem} — seguindo com o próximo.`,
      );
    }
  }

  return { questoes, cotasEsgotadas };
}