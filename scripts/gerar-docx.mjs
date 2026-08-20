import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const ROTA = path.resolve("docs/navehub-documentacao.docx");

function h1(texto) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: texto, bold: true })] });
}
function h2(texto) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: texto, bold: true })] });
}
function h3(texto) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: texto, bold: true })] });
}
function p(texto, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: texto, ...opts })],
  });
}
function bullet(texto) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text: texto })],
  });
}
function codigo(texto) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 400 },
    children: [new TextRun({ text: texto, font: "Consolas", size: 18 })],
  });
}

function linhaTabela(celulas, negrito = false) {
  return new TableRow({
    children: celulas.map(
      (texto) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: texto, bold: negrito })] })],
        }),
    ),
  });
}

const COMMITS = [
  {
    hash: "d9815c0",
    msg: "salvaguarda: snapshot navehub (api + fe) — 2682 questões classificadas, filtros matéria/assunto, tentativas na API local",
    conteudo:
      "Primeiro commit da branch de salvaguarda. Sobe o repositório inteiro (navehub_api + navehub_fe) incluindo o banco SQLite com as 2682 questões do ENEM baixadas da enem.dev e classificadas pelo Gemini. A API foi corrigida para subir no Windows (pathToFileURL) e o FE passa a consumir a API local via proxy /api.",
    motivo: "Garantir um ponto de restauração completo antes de qualquer mudança (a classificação do Gemini não se refaz sem queimar a cota diária).",
  },
  {
    hash: "1c7ed97",
    msg: "fe: remove filtro de área; assuntos dependem só da matéria (cascata matéria→assunto)",
    conteudo:
      "Remove o filtro de Área dos filtros de questões (Ano, Matéria e Assunto continuam). A lista de assuntos passa a depender somente da matéria escolhida: selecionar 'Biologia' carrega apenas os assuntos dela. O 'continuar de onde parou' e o card de sugestão do dashboard são ajustados para o novo formato.",
    motivo: "O pedido foi separar questões por conteúdo (matéria/assunto); a área era redundante e poluía o filtro.",
  },
  {
    hash: "2981d5d",
    msg: "fix: mapeia alternativas (letter/text/file/isCorrect → letra/texto/arquivo/correta) na API",
    conteudo:
      "A enem.dev entrega as alternativas no formato {letter, text, file, isCorrect}, e o banco guarda esse formato cru. A rota GET /questoes repassava cru, mas o FE espera {letra, texto, arquivo, correta} — por isso as alternativas renderizavam só 'A)' sem texto. O mapeamento agora acontece na API (mapearQuestao).",
    motivo: "Corrige o bug visual: alternativas sem texto no app.",
  },
  {
    hash: "4578ea4",
    msg: "feat: API do caderno (PDF → questões estruturadas por matéria/assunto) + página AI ENRIQUE BAITOLA no dashboard com upload e filtros",
    conteudo:
      "Nova API navehub_caderno_api (porta 3334): recebe um PDF de caderno de questões, detecta se é digital ou escaneado (OCR com Tesseract se preciso), extrai figuras das páginas em PNG (pdfjs-dist) e usa o Gemini para estruturar cada questão (matéria, assunto, enunciado, alternativas, gabarito) — com rotação de modelos para contornar a cota diária. Endpoints: POST /importar, GET /questoes (filtros), /metadados/materias, /metadados/assuntos, /imagens/:nome, /health, /importacao/status. No FE, novo item 'Caderno' na barra lateral com a página 'AI ENRIQUE BAITOLA' (upload por arrastar-e-soltar, barra de progresso, resumo e filtros).",
    motivo: "Automatizar a transformação de cadernos em PDF em uma API de questões consultável pelo app.",
  },
];

function tabelaCommits() {
  const linhas = [
    linhaTabela(["Hash", "Mensagem", "Conteúdo", "Motivo"], true),
    ...COMMITS.map((c) => linhaTabela([c.hash, c.msg, c.conteudo, c.motivo])),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: linhas,
  });
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
  sections: [
    {
      children: [
        h1("NaveHub — Documentação do Projeto"),
        p("Documento gerado automaticamente em 20/08/2026. Cobre a arquitetura, o que foi construído, os bugs corrigidos, os endpoints e o histórico de commits da branch de salvaguarda.", { italics: true }),

        h1("1. Visão geral"),
        p("O NaveHub é um app de estudos para o ENEM com três partes:"),
        bullet("navehub_fe — frontend em React + Vite + Tailwind (SPA do aluno e do professor)."),
        bullet("navehub_api — API Fastify + SQLite com as questões do ENEM baixadas da enem.dev e classificadas por matéria/assunto com o Gemini (porta 3333)."),
        bullet("navehub_caderno_api — API Fastify que transforma cadernos de questões em PDF em uma API consultável, com matéria/assunto, alternativas, gabarito e figuras (porta 3334)."),

        h1("2. API do ENEM (navehub_api)"),
        h2("2.1 Dados"),
        bullet("2.682 questões das provas 2009–2023 baixadas da enem.dev (todas as edições, idiomas português/espanhol/inglês)."),
        bullet("Todas classificadas pelo Gemini com matéria e assunto (taxonomia por área do ENEM)."),
        bullet("Banco SQLite em navehub_api/data/navehub.db — versionado no git como backup (a classificação não se refaz sem queimar a cota do Gemini)."),
        h2("2.2 Classificação com Gemini"),
        bullet("Script scripts/sync.ts: baixa as provas da enem.dev, grava no banco e classifica em lotes de 50 questões."),
        bullet("Rotação de modelos flash (GEMINI_MODELS no .env): a cota grátis é de ~20 requisições/dia POR MODELO, então ao esgotar um modelo o próximo assume automaticamente (429/quota)."),
        bullet("Cada classificação é validada contra uma taxonomia fixa de matérias e assuntos por área."),
        h2("2.3 Endpoints"),
        codigo("GET /health — status e contagens"),
        codigo("GET /questoes?ano=&area=&materia=&assunto=&idioma=&pagina=&porPagina="),
        codigo("GET /questoes/:enemId — questão individual"),
        codigo("GET /metadados/areas | /metadados/materias?area= | /metadados/assuntos?materia="),
        codigo("GET /metadados/anos — anos distintos no banco"),
        codigo("POST /tentativas — registra resposta do aluno (upsert por aluno+questão)"),
        codigo("GET /tentativas?alunoId= — série completa para a evolução diária"),
        codigo("GET /estatisticas?alunoId= — total, % de acerto e desempenho por área"),
        h2("2.4 Bugs corrigidos"),
        bullet("Servidor não subia no Windows: a comparação import.meta.url === 'file://' + process.argv[1] nunca batia no Windows (formato de URL diferente). Corrigido com pathToFileURL(process.argv[1]).href — o processo saía em silêncio sem escutar na porta."),
        bullet("Alternativas sem texto no app: o banco guarda o formato cru da enem.dev ({letter, text, file, isCorrect}) e o FE espera {letra, texto, arquivo, correta}. O mapeamento agora é feito na API (mapearQuestao em src/routes/questoes.ts)."),

        h1("3. Frontend (navehub_fe)"),
        h2("3.1 Migração do Supabase para a API local"),
        bullet("O projeto Supabase configurado estava com todas as tabelas vazias (questions, profiles, question_attempts, essays) e sem acesso ao console para migrações."),
        bullet("Decisão: o FE passou a consumir a API local (proxy /api → localhost:3333 no Vite) para questões, tentativas, estatísticas e evolução."),
        bullet("Auth ainda usa o Supabase (signInWithPassword/signUp); essaios continuam no Supabase."),
        h2("3.2 Filtros de questões"),
        bullet("Filtros: Ano, Matéria e Assunto (o filtro de Área foi removido a pedido)."),
        bullet("Cascata: escolher uma matéria carrega somente os assuntos dela; o botão 'Buscar questões' dispara a pesquisa."),
        bullet("O card da questão exibe badges de ano, área, matéria e assunto."),
        h2("3.3 Tentativas e estatísticas"),
        bullet("Responder uma questão registra a tentativa na API local (POST /tentativas)."),
        bullet("Dashboard: total de questões feitas, % de acerto, desempenho por área e evolução diária — tudo lido da API local."),

        h1("4. API do Caderno (navehub_caderno_api)"),
        h2("4.1 Pipeline de importação"),
        bullet("Upload do PDF (POST /importar, campo multipart 'pdf')."),
        bullet("Detecção automática: extrai o texto por página com pdfjs-dist; se o texto for insuficiente, assume PDF escaneado e aplica OCR (Tesseract.js, idioma português)."),
        bullet("Figuras: páginas com imagens são renderizadas em PNG e servidas em /imagens/:nome."),
        bullet("Estruturação com Gemini: lotes de páginas → JSON com matéria, assunto, enunciado, introdução das alternativas, alternativas A–E e gabarito (se indicado no caderno). Rotação de modelos igual à API do ENEM."),
        bullet("As questões são gravadas no SQLite (data/caderno.db) com ids caderno-1, caderno-2… e substituem a importação anterior."),
        h2("4.2 Endpoints"),
        codigo("POST /importar — envia o PDF e processa"),
        codigo("GET /importacao/status — progresso em tempo real"),
        codigo("GET /questoes?materia=&assunto=&pagina=&porPagina="),
        codigo("GET /metadados/materias | /metadados/assuntos?materia="),
        codigo("GET /imagens/:nome — figuras extraídas"),
        codigo("GET /health — status e contagem"),
        h2("4.3 Dashboard"),
        bullet("Novo item 'Caderno' na barra lateral, com a página 'AI ENRIQUE BAITOLA': arrastar-e-soltar o PDF, barra de progresso, cards de resultado (questões/páginas/modo de leitura) e filtros de matéria/assunto para conferir o que foi importado."),

        h1("5. Git — branch de salvaguarda"),
        p("Tudo está na branch 'salvaguarda-2026-08-20' do repositório https://github.com/EnriqueSalesDev/navehub_fe (as branches main, alexTesta e developer não foram tocadas). O backup inclui o código e o banco de dados SQLite; .env e logs ficam de fora."),
        h3("Como rodar (3 servidores)"),
        codigo("navehub_api:          npm run dev  → http://localhost:3333"),
        codigo("navehub_caderno_api:  npm run dev  → http://localhost:3334"),
        codigo("navehub_fe:           npm run dev  → http://localhost:5173"),
        h3("Como restaurar o backup"),
        bullet("git clone -b salvaguarda-2026-08-20 https://github.com/EnriqueSalesDev/navehub_fe"),
        bullet("npm install em cada pasta (navehub_api, navehub_caderno_api, navehub_fe)."),
        bullet("Copiar o .env (GEMINI_API_KEY; o do FE tem as chaves do Supabase)."),
        bullet("O banco já vem no repositório: as 2682 questões classificadas e as importações do caderno."),
        h3("Os 4 commits explicados"),
        tabelaCommits(),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
await writeFile(ROTA, buffer);
console.log(`DOCX gerado: ${ROTA} (${buffer.length} bytes)`);