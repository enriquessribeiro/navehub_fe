import "dotenv/config";
import {
  listarProvas,
  listarQuestoesDoAno,
  mapearArea,
  type EnemQuestao,
} from "../src/services/enemClient.js";
import {
  classificarLote,
  MODELO_ESGOTADO,
  type ItemClassificacao,
} from "../src/services/classificador.js";
import {
  db,
  inserirQuestao,
  marcarClassificacao,
  contarTotais,
} from "../src/db.js";

const TAMANHO_LOTE = 50;
const TENTATIVAS = 4;
const PAUSA_INICIAL_MS = 2000;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function chaveIdioma(questao: EnemQuestao): string {
  return `${questao.year}-${questao.index}-${questao.language ?? "portugues"}`;
}

function gravarQuestao(questao: EnemQuestao): void {
  inserirQuestao({
    enem_id: chaveIdioma(questao),
    ano: questao.year,
    area: mapearArea(questao.discipline),
    materia: null,
    assunto: null,
    idioma: questao.language ?? "portugues",
    titulo: questao.title,
    enunciado: questao.context,
    introducao_alternativas: questao.alternativesIntroduction,
    alternativas: questao.alternatives,
    arquivos: questao.files,
    gabarito: questao.correctAlternative,
    classificada_em: null,
    criado_em: new Date().toISOString(),
  });
}

async function baixarQuestoes(anos: number[]): Promise<number> {
  let total = 0;
  for (const ano of anos) {
    let offset = 0;
    let paginando = true;
    while (paginando) {
      const pagina = await listarQuestoesDoAno(ano, offset);
      for (const questao of pagina.questoes) {
        gravarQuestao(questao);
        total += 1;
      }
      offset += pagina.questoes.length;
      paginando = pagina.questoes.length > 0 && offset < pagina.total;
      await aguardar(150);
    }
    console.log(`  ${ano}: ${total} questões acumuladas`);
  }
  return total;
}

/** Questões ainda não classificadas, agrupadas por (ano, index), priorizando
 *  a versão em português como fonte de classificação. */
function filasPendentes(): ItemClassificacao[] {
  const pendentes = db
    .prepare(
      `SELECT enem_id, ano, area, titulo, enunciado
       FROM questoes
       WHERE classificada_em IS NULL
       ORDER BY ano DESC, enem_id ASC`,
    )
    .all() as Array<{
    enem_id: string;
    ano: number;
    area: string | null;
    titulo: string;
    enunciado: string | null;
  }>;

  const porChave = new Map<string, ItemClassificacao>();
  for (const linha of pendentes) {
    const partes = linha.enem_id.split("-");
    const index = partes[partes.length - 2];
    const chaveIndex = `${linha.ano}-${index}`;
    if (!porChave.has(chaveIndex)) {
      porChave.set(chaveIndex, {
        chave: chaveIndex,
        area: linha.area as ItemClassificacao["area"],
        titulo: linha.titulo,
        enunciado: linha.enunciado,
      });
    }
  }
  return [...porChave.values()];
}

function montarLotes(itens: ItemClassificacao[]): ItemClassificacao[][] {
  const lotes: ItemClassificacao[][] = [];
  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    lotes.push(itens.slice(i, i + TAMANHO_LOTE));
  }
  return lotes;
}

function cotaDiariaEsgotada(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return (
    mensagem === MODELO_ESGOTADO ||
    mensagem.includes("quota") ||
    mensagem.includes("Quota") ||
    mensagem.includes("429")
  );
}

async function classificarComRetry(
  lote: ItemClassificacao[],
): Promise<Map<string, { materia: string; assunto: string }> | null> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    try {
      return await classificarLote(lote);
    } catch (erro) {
      ultimoErro = erro;
      if (cotaDiariaEsgotada(erro)) {
        console.error(
          `  cota diária do Gemini esgotada: ${erro instanceof Error ? erro.message : erro}\n  PARE o sync e rode de novo amanhã (ou habilite billing no Google AI Studio).`,
        );
        return null;
      }
      const pausa = PAUSA_INICIAL_MS * 2 ** (tentativa - 1);
      console.warn(
        `  lote falhou (tentativa ${tentativa}/${TENTATIVAS}): ${
          erro instanceof Error ? erro.message : erro
        } — aguardando ${pausa}ms`,
      );
      await aguardar(pausa);
    }
  }
  throw ultimoErro;
}

async function classificarPendentes(): Promise<void> {
  const itens = filasPendentes();
  if (itens.length === 0) {
    console.log("Nenhuma classificação pendente.");
    return;
  }
  console.log(`Classificando ${itens.length} questões (${Math.ceil(itens.length / TAMANHO_LOTE)} lotes de ${TAMANHO_LOTE})…`);

  const lotes = montarLotes(itens);
  let classificadas = 0;
  for (let i = 0; i < lotes.length; i += 1) {
    const lote = lotes[i];
    try {
      const resultado = await classificarComRetry(lote);
      if (resultado === null) {
        console.log(`  Parando: cota do Gemini esgotada após ${classificadas} novas classificações.`);
        break;
      }
      for (const [chave, classificacao] of resultado) {
        const [ano, index] = chave.split("-").map(Number);
        marcarClassificacao(ano, index, classificacao.materia, classificacao.assunto);
      }
      classificadas += resultado.size;
      console.log(`  lote ${i + 1}/${lotes.length}: +${resultado.size} classificadas`);
    } catch (erro) {
      console.error(
        `  lote ${i + 1}/${lotes.length} abortado após ${TENTATIVAS} tentativas: ${
          erro instanceof Error ? erro.message : erro
        }`,
      );
    }
    await aguardar(500);
  }
  console.log(`Classificação concluída: ${classificadas} novas.`);
}

async function principal(): Promise<void> {
  console.log("1) Buscando provas na enem.dev…");
  const anos = await listarProvas();
  console.log(`   Provas encontradas: ${anos.join(", ")}`);

  console.log("2) Baixando e gravando questões no banco…");
  const totalBaixadas = await baixarQuestoes(anos);
  console.log(`   ${totalBaixadas} questões gravadas.`);

  console.log("3) Classificando com Gemini…");
  await classificarPendentes();

  const resumo = contarTotais();
  console.log(
    `\nResumo: ${resumo.total} questões, ${resumo.classificadas} classificadas, ${resumo.semAssunto} pendentes.`,
  );
}

await principal();