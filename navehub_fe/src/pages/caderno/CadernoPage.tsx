import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import {
  consultarStatusImportacao,
  importarCaderno,
  listarAssuntosCaderno,
  listarMateriasCaderno,
  listarQuestoesCaderno,
  type CadernoQuestao,
} from "@/services/cadernoService";

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
      <path
        d="M12 16V4m0 0 4 4m-4-4-4 4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CadernoPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    totalQuestoes: number;
    totalPaginas: number;
    digital: boolean;
  } | null>(null);

  const [materia, setMateria] = useState<string | null>(null);
  const [assunto, setAssunto] = useState<string | null>(null);
  const [materias, setMaterias] = useState<string[]>([]);
  const [assuntos, setAssuntos] = useState<string[]>([]);
  const [questoes, setQuestoes] = useState<CadernoQuestao[]>([]);
  const [totalQuestoes, setTotalQuestoes] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listarMateriasCaderno()
      .then(setMaterias)
      .catch(() => setMaterias([]));
  }, []);

  useEffect(() => {
    setAssunto(null);
    void listarAssuntosCaderno(materia)
      .then(setAssuntos)
      .catch(() => setAssuntos([]));
  }, [materia]);

  function selecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivoEscolhido = evento.target.files?.[0] ?? null;
    setArquivo(arquivoEscolhido);
    setErro(null);
    setResultado(null);
  }

  function aoArrastar(evento: DragEvent) {
    evento.preventDefault();
    setArrastando(evento.type === "dragenter" || evento.type === "dragover");
  }

  function aoSoltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastando(false);
    const arquivoSoltado = evento.dataTransfer.files?.[0] ?? null;
    if (!arquivoSoltado) return;
    setArquivo(arquivoSoltado);
    setErro(null);
    setResultado(null);
  }

  async function enviar() {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    setResultado(null);
    setProgresso(10);
    try {
      const resposta = await importarCaderno(arquivo);
      setProgresso(100);
      setResultado({
        totalQuestoes: resposta.totalQuestoes,
        totalPaginas: resposta.totalPaginas,
        digital: resposta.digital,
      });
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      const [listaMaterias, listaQuestoes] = await Promise.all([
        listarMateriasCaderno(),
        listarQuestoesCaderno({ porPagina: 20 }),
      ]);
      setMaterias(listaMaterias);
      setQuestoes(listaQuestoes.questoes);
      setTotalQuestoes(listaQuestoes.total);
      setMateria(null);
      setAssunto(null);
    } catch (erroImportacao) {
      setErro(
        erroImportacao instanceof Error
          ? erroImportacao.message
          : "Não foi possível importar o caderno.",
      );
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      void consultarStatusImportacao().then((status) => {
        if (status.emAndamento) {
          setEnviando(true);
          setProgresso(status.progresso);
        }
      });
    }, 3000);
    return () => window.clearInterval(intervalo);
  }, []);

  async function buscar() {
    const resultadoBusca = await listarQuestoesCaderno({
      materia,
      assunto,
      porPagina: 100,
    });
    setQuestoes(resultadoBusca.questoes);
    setTotalQuestoes(resultadoBusca.total);
  }

  return (
    <>
      <Topbar titulo="AI ENRIQUE BAITOLA" subtitulo="Importe cadernos de questões em PDF e gere a API automaticamente." />

      <div className="space-y-6 p-4 sm:p-8">
        <Card>
          <div
            onDragEnter={aoArrastar}
            onDragOver={aoArrastar}
            onDragLeave={aoArrastar}
            onDrop={aoSoltar}
            className={
              "flex flex-col items-center justify-center gap-3 rounded-control border-2 border-dashed px-6 py-12 text-center transition-colors " +
              (arrastando
                ? "border-nave-yellow-strong bg-nave-yellow-soft"
                : "border-line")
            }
          >
            <span className="text-muted">
              <IconUpload />
            </span>
            <p className="text-sm font-medium text-ink">
              {arquivo
                ? arquivo.name
                : "Arraste o PDF do caderno aqui ou clique para escolher"}
            </p>
            <p className="text-xs text-muted">
              O PDF é lido, as questões são estruturadas por matéria e assunto e ficam
              disponíveis na API automaticamente.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={selecionarArquivo}
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => inputRef.current?.click()}>
                Escolher arquivo
              </Button>
              <Button onClick={() => void enviar()} disabled={!arquivo || enviando}>
                {enviando ? "Importando…" : "Importar caderno"}
              </Button>
            </div>
          </div>

          {enviando && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>Processando caderno…</span>
                <span className="font-mono">{progresso}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-nave-yellow transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          )}

          {erro && (
            <p className="mt-4 rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {erro}
            </p>
          )}

          {resultado && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card accent className="p-4">
                <p className="font-mono text-2xl font-semibold text-ink">
                  {resultado.totalQuestoes}
                </p>
                <p className="text-xs text-muted">questões importadas</p>
              </Card>
              <Card accent className="p-4">
                <p className="font-mono text-2xl font-semibold text-ink">
                  {resultado.totalPaginas}
                </p>
                <p className="text-xs text-muted">páginas lidas</p>
              </Card>
              <Card accent className="p-4">
                <p className="font-mono text-2xl font-semibold text-ink">
                  {resultado.digital ? "PDF" : "OCR"}
                </p>
                <p className="text-xs text-muted">modo de leitura</p>
              </Card>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                Matéria
                <select
                  value={materia ?? ""}
                  onChange={(e) => setMateria(e.target.value || null)}
                  className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-nave-yellow-strong"
                >
                  <option value="">Todas</option>
                  {materias.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                Assunto
                <select
                  value={assunto ?? ""}
                  onChange={(e) => setAssunto(e.target.value || null)}
                  className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-nave-yellow-strong"
                >
                  <option value="">Todos</option>
                  {assuntos.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" onClick={() => void buscar()}>
                Filtrar
              </Button>
            </div>
            <p className="font-mono text-sm text-muted">
              {totalQuestoes} questões no caderno
            </p>
          </div>

          {questoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Nenhuma questão importada ainda. Envie um PDF acima.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {questoes.map((questao) => (
                <li key={questao.id} className="py-3">
                  <p className="text-sm font-medium text-ink">{questao.enunciado ?? questao.titulo}</p>
                  <p className="mt-1 text-xs text-muted">
                    {questao.materia} · {questao.assunto} · página {questao.pagina_origem}
                    {questao.gabarito ? ` · gabarito ${questao.gabarito}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}