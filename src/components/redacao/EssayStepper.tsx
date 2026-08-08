interface EssayStepperStep {
  titulo: string;
  descricao: string;
}

const ETAPAS: EssayStepperStep[] = [
  { titulo: "Você envia a redação", descricao: "Digite o texto na plataforma e envie para a fila de correção." },
  { titulo: "O professor corrige", descricao: "A correção é humana, feita pelo professor no tempo dele." },
  { titulo: "Você recebe o retorno", descricao: "Nota e feedback aparecem em \u201cMinhas redações\u201d, sem precisar de e-mail." },
];

export function EssayStepper() {
  return (
    <ol className="space-y-0">
      {ETAPAS.map((etapa, indice) => {
        const numero = indice + 1;
        const éÚltima = numero === ETAPAS.length;

        return (
          <li key={etapa.titulo} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nave-black font-mono text-xs font-semibold text-nave-yellow">
                {numero}
              </span>
              {!éÚltima && <span className="my-1 w-px flex-1 bg-line" />}
            </div>
            <div className={éÚltima ? "pb-0" : "pb-5"}>
              <p className="text-sm font-semibold text-ink">{etapa.titulo}</p>
              <p className="mt-0.5 text-sm text-muted">{etapa.descricao}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
