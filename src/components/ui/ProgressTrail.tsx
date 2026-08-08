interface ProgressTrailProps {
  atual: number;
  meta: number;
}

const WIDTH = 280;
const TRAIL_Y = 34;
const TRAIL_START_X = 14;
const TRAIL_END_X = WIDTH - 14;
const MARKER_COUNT = 4;

/**
 * Elemento de assinatura do NaveHub: em vez de um anel de progresso
 * genérico, o avanço do aluno é mostrado como uma trilha de lançamento —
 * o "traço" que a nave percorre até a meta. Reforça a metáfora do nome
 * (Nave Cursos / NaveHub) em vez de ser só decoração.
 */
export function ProgressTrail({ atual, meta }: ProgressTrailProps) {
  const metaSegura = meta > 0 ? meta : 1;
  const proporcao = Math.min(atual / metaSegura, 1);
  const naveX = TRAIL_START_X + proporcao * (TRAIL_END_X - TRAIL_START_X);

  const marcadores = Array.from({ length: MARKER_COUNT + 1 }, (_, index) => {
    const t = index / MARKER_COUNT;
    return TRAIL_START_X + t * (TRAIL_END_X - TRAIL_START_X);
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} 56`} className="h-14 w-full" role="img" aria-label={`${atual} de ${meta} questões`}>
      {/* trilha base (pontilhada) */}
      <line
        x1={TRAIL_START_X}
        y1={TRAIL_Y}
        x2={TRAIL_END_X}
        y2={TRAIL_Y}
        stroke="#E7E4D9"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 7"
      />

      {/* trecho já percorrido */}
      <line
        x1={TRAIL_START_X}
        y1={TRAIL_Y}
        x2={naveX}
        y2={TRAIL_Y}
        stroke="#F2B705"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* marcadores de referência ao longo da trilha */}
      {marcadores.map((x) => (
        <circle key={x} cx={x} cy={TRAIL_Y} r={2} fill="#E7E4D9" />
      ))}

      {/* rastro/propulsão atrás da nave */}
      <circle cx={naveX - 9} cy={TRAIL_Y} r={4} fill="#FCE8A8" opacity={0.9} />

      {/* nave: pequeno triângulo apontando para o destino */}
      <g transform={`translate(${naveX}, ${TRAIL_Y})`}>
        <circle r={9} fill="#0B0B0C" />
        <path d="M -3.5 -4 L 5 0 L -3.5 4 Z" fill="#F2B705" />
      </g>

      {/* meta (bandeira de chegada) */}
      <g transform={`translate(${TRAIL_END_X}, ${TRAIL_Y})`}>
        <line x1={0} y1={-10} x2={0} y2={10} stroke="#17170F" strokeWidth={2} />
        <path d="M 0 -10 L 8 -7 L 0 -4 Z" fill="#17170F" />
      </g>
    </svg>
  );
}
