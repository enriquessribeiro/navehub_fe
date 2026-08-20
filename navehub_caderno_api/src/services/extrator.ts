import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);

const requireDoPdfjs = createRequire(require.resolve("pdfjs-dist/package.json"));
const { createCanvas } = requireDoPdfjs("@napi-rs/canvas") as typeof import("@napi-rs/canvas");

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));
const DIRETORIO_IMAGENS = process.env.CADERNO_IMAGENS_PATH
  ? path.resolve(process.cwd(), process.env.CADERNO_IMAGENS_PATH)
  : path.resolve(process.cwd(), "data/imagens");

const DIRETORIO_FONTES_PADRAO =
  path.dirname(require.resolve("pdfjs-dist/package.json")) + "/standard_fonts/";

const DIRETORIO_CMAPS =
  path.dirname(require.resolve("pdfjs-dist/package.json")) + "/cmaps/";

const ESCALA_RENDER = 2;

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

async function abrirDocumento(caminho: string) {
  const dados = new Uint8Array(await fs.promises.readFile(caminho));
  return getDocument({
    data: dados,
    standardFontDataUrl: DIRETORIO_FONTES_PADRAO,
    cMapUrl: DIRETORIO_CMAPS,
    cMapPacked: true,
  }).promise;
}

async function extrairTextoDigital(caminho: string): Promise<PaginaExtraida[]> {
  const documento = await abrirDocumento(caminho);

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
  if (numeros.length === 0) return;
  await fs.promises.mkdir(DIRETORIO_IMAGENS, { recursive: true });

  const documento = await abrirDocumento(caminho);
  try {
    for (const numero of numeros) {
      const pagina = await documento.getPage(numero);
      try {
        const viewport = pagina.getViewport({ scale: ESCALA_RENDER });
        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        const contexto = canvas.getContext("2d");
        await pagina.render({
          canvasContext: contexto as never,
          viewport,
        }).promise;
        const png = canvas.toBuffer("image/png");
        await fs.promises.writeFile(
          path.join(DIRETORIO_IMAGENS, `pagina-${numero}.png`),
          png,
        );
      } finally {
        pagina.cleanup();
      }
    }
  } finally {
    await documento.destroy();
  }
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