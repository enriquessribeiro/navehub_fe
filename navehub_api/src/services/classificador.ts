import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AreaEnem } from "../db.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Faltando GEMINI_API_KEY no .env");
  process.exit(1);
}

export const MODELO_ESGOTADO = "COTA_DIARIA_ESGOTADA";

/**
 * Modelos usados na classificação. A cota grátis do Gemini é de 20
 * requisições/dia POR MODELO, então rotacionamos entre vários modelos flash
 * para classificar tudo sem custo. Ao esgotar um modelo (429/quota), o
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

/** Índice do próximo modelo a tentar (avança quando o atual esgota a cota). */
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

/** Fonte de classificação de uma questão (a versão em português, uma vez por index). */
export interface ItemClassificacao {
  chave: string;
  area: AreaEnem | null;
  titulo: string;
  enunciado: string | null;
}

export interface Classificacao {
  materia: string;
  assunto: string;
}

const TAXONOMIA: Record<string, string> = {
  matematica:
    "Matemática → assuntos: Probabilidade, Análise Combinatória, Estatística, " +
    "Funções, Geometria Plana, Geometria Espacial, Geometria Analítica, Álgebra, " +
    "Aritmética, Grandezas e Medidas, Progressões, Matrizes, Porcentagem e Juros, " +
    "Razão e Proporção, Trigonometria, Lógica e Conjuntos",
  linguagens:
    "matérias: Português, Literatura, Língua Estrangeira, Artes, Educação Física → " +
    "assuntos: Interpretação de Texto, Gramática, Figuras de Linguagem, Gêneros " +
    "Textuais, Escolas Literárias, Análise de Obra de Arte, Música, Cinema, " +
    "Semiótica, Coesão e Coerência",
  ciencias_humanas:
    "matérias: História, Geografia, Filosofia, Sociologia → assuntos: História do " +
    "Brasil, História Mundial, Idade Antiga, Idade Média, Idade Moderna, Idade " +
    "Contemporânea, Geografia Física, Geografia Humana, Geopolítica, Urbanização, " +
    "Climatologia, Cartografia, Ética, Filosofia Antiga, Filosofia Moderna, " +
    "Sociologia Clássica, Movimentos Sociais, Trabalho e Sociedade",
  ciencias_natureza:
    "matérias: Biologia, Física, Química → assuntos: Biologia: Genética, Ecologia, " +
    "Fisiologia Humana, Citologia, Evolução, Botânica, Zoologia, Bioquímica; " +
    "Física: Mecânica, Eletricidade, Ondas, Termologia, Óptica, Eletromagnetismo, " +
    "Física Moderna, Hidrostática; Química: Química Orgânica, Química Inorgânica, " +
    "Físico-Química, Estequiometria, Soluções, Eletroquímica, Termoquímica, " +
    "Atomística, Cálculo Estequiométrico",
};

function montarPrompt(itens: ItemClassificacao[]): string {
  const linhas = itens
    .map(
      (item) =>
        `- chave ${item.chave} | área ${item.area ?? "desconhecida"} | ${item.titulo} | ` +
        `enunciado: ${(item.enunciado ?? "").slice(0, 900).replace(/\s+/g, " ")}`,
    )
    .join("\n");

  return `Você é um especialista no ENEM. Classifique cada questão na matéria e no assunto corretos.

Taxonomia por área:
${TAXONOMIA.matematica}

${TAXONOMIA.linguagens}

${TAXONOMIA.ciencias_humanas}

${TAXONOMIA.ciencias_natureza}

Regras:
- materia: nome da matéria (ex.: Matemática, Biologia, Física, Química, História, Geografia, Português, Literatura, Filosofia, Sociologia, Artes).
- assunto: tópico específico dentro da matéria, usando os termos da taxonomia quando possível (ex.: Probabilidade, Análise Combinatória, Genética, Mecânica).
- Não invente termos fora da taxonomia; escolha o mais próximo.
- Para questões de linguagens em inglês/espanhol, materia = Língua Estrangeira.

Responda SOMENTE com JSON neste formato (sem markdown):
{"classificacoes":[{"chave":"...","materia":"...","assunto":"..."}]}

Questões:
${linhas}`;
}

/**
 * Classifica um lote de questões com o Gemini e devolve chave → { materia, assunto }.
 * Lança erro em formato inválido para o chamador tentar de novo.
 */
export async function classificarLote(
  itens: ItemClassificacao[],
): Promise<Map<string, Classificacao>> {
  const resultado = await gerarTextoComRotacao(montarPrompt(itens));
  const texto = resultado;
  const cru = JSON.parse(texto) as {
    classificacoes?: Array<{ chave?: string; materia?: string; assunto?: string }>;
  };
  if (!Array.isArray(cru.classificacoes)) {
    throw new Error("Resposta do Gemini sem o array classificacoes");
  }

  const mapa = new Map<string, Classificacao>();
  for (const item of cru.classificacoes) {
    if (!item.chave || !item.materia || !item.assunto) continue;
    mapa.set(item.chave, { materia: item.materia.trim(), assunto: item.assunto.trim() });
  }
  if (mapa.size === 0) {
    throw new Error("Resposta do Gemini sem classificações válidas");
  }
  return mapa;
}