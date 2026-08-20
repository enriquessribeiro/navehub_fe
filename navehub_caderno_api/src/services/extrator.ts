import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfToPng } from "pdf-to-png-converter";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));
const DIRETORIO_IMAGENS = process.env.CADERNO_IMAGENS_PATH
  ? path.resolve(process.cwd(), process.env.CADERNO_IMAGENS_PATH)
  : path.resolve(diretorioAtual, "../data/imagens");

const DIRETORIO_FONTES_PADRAO =
  path.dirname(require.resolve("pdfjs-dist/package.json")) + "/standard_fonts/";

export interface PaginaExtraida {
  numero: number;
  texto: string;
  temFigura: boolean;
}

export interface ResultadoExtracao {
  paginas: PaginaExtraida[];
  digital: boolean;
  totalCaracteres: number;
}

const MINIMO_CARACTERES_POR_PAGINA = 60;

async function extrairTextoDigital(caminho: string): Promise<PaginaExtraida[]> {
  const dados = new Uint8Array(await fs.promises.readFile(caminho));
  const documento = await getDocument({
    data: dados,
    standardFontDataUrl: DIRETORIO_FONTES_PADRAO,
  }).promise;

  const paginas: PaginaExtraida[] = [];
  for (let numero = 1; numero <= documento.numPages; numero += 1) {
    const pagina = await documento.getPage(numero);
    const [conteudo, operadores] = await Promise.all([
      pagina.getTextContent(),
      pagina.getOperatorList(),
    ]);
    const texto = conteudo.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const temFigura = operadores.fnArray.some((fn) => fn === OPS.paintImageXObject);
    paginas.push({ numero, texto, temFigura });
  }
  await documento.destroy();
  return paginas;
}

async function renderizarPaginasParaPng(
  caminho: string,
  numeros: number[],
): Promise<void> {
  await fs.promises.mkdir(DIRETORIO_IMAGENS, { recursive: true });
  await pdfToPng(caminho, {
    outputFolder: DIRETORIO_IMAGENS,
    outputFileMaskFunc: (numero) => `pagina-${numero}.png`,
    pagesToProcess: numeros,
  });
}

async function extrairComOcr(caminho: string, totalPaginas: number): Promise<PaginaExtraida[]> {
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1);
  await renderizarPaginasParaPng(caminho, numeros);

  const worker = await createWorker("por");
  const paginas: PaginaExtraida[] = [];
  try {
    for (const numero of numeros) {
      const arquivoPng = path.join(DIRETORIO_IMAGENS, `pagina-${numero}.png`);
      const { data } = await worker.recognize(arquivoPng);
      paginas.push({ numero, texto: data.text, temFigura: true });
    }
  } finally {
    await worker.terminate();
  }
  return paginas;
}

export async function extrairPaginas(caminho: string): Promise<ResultadoExtracao> {
  let paginas = await extrairTextoDigital(caminho);

  const totalCaracteres = paginas.reduce((soma, pagina) => soma + pagina.texto.trim().length, 0);
  const digital = paginas.length > 0 &&
    totalCaracteres / paginas.length >= MINIMO_CARACTERES_POR_PAGINA;

  if (!digital) {
    console.warn(
      `  texto digital insuficiente (${totalCaracteres} caracteres em ${paginas.length} páginas) — assumindo PDF escaneado, aplicando OCR…`,
    );
    paginas = await extrairComOcr(caminho, paginas.length || 1);
  }

  return { paginas, digital, totalCaracteres };
}

export async function renderizarFiguras(caminho: string, paginas: PaginaExtraida[]): Promise<void> {
  const paginasComFigura = paginas.filter((pagina) => pagina.temFigura);
  if (paginasComFigura.length === 0) return;

  await renderizarPaginasParaPng(
    caminho,
    paginasComFigura.map((pagina) => pagina.numero),
  );
}

export function caminhoImagemPagina(numero: number): string {
  return `/imagens/pagina-${numero}.png`;
}

export { DIRETORIO_IMAGENS };