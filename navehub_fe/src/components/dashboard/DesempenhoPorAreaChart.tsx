import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ROTULOS_AREA } from "@/components/questoes/QuestionFilters";
import type { EstatisticasAluno } from "@/services/questionsService";
import type { AreaEnem } from "@/types/database.types";

const COR_ALTA = "#1E8E5A";
const COR_MEDIA = "#B8890A";
const COR_BAIXA = "#C4432E";

function corPorDesempenho(percentual: number): string {
  if (percentual >= 70) return COR_ALTA;
  if (percentual >= 40) return COR_MEDIA;
  return COR_BAIXA;
}

interface EntradaArea {
  area: AreaEnem;
  rotulo: string;
  percentual: number;
  corretas: number;
  total: number;
}

interface TooltipPayloadItem {
  payload?: EntradaArea;
}

interface TooltipAreaProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function TooltipArea({ active, payload }: TooltipAreaProps) {
  const entrada = payload?.[0]?.payload;
  if (!active || !entrada) return null;

  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-card">
      <p className="text-xs font-semibold text-ink">{entrada.rotulo}</p>
      <p className="mt-0.5 font-mono text-xs text-muted">
        {entrada.corretas}/{entrada.total} questões · {entrada.percentual}%
      </p>
    </div>
  );
}

interface DesempenhoPorAreaChartProps {
  desempenho: EstatisticasAluno["desempenhoPorArea"];
  carregando?: boolean;
}

export function DesempenhoPorAreaChart({ desempenho, carregando = false }: DesempenhoPorAreaChartProps) {
  const areas = Object.keys(ROTULOS_AREA) as AreaEnem[];

  const entradas: EntradaArea[] = areas.map((area) => {
    const dados = desempenho[area];
    return {
      area,
      rotulo: ROTULOS_AREA[area],
      percentual: dados?.percentual ?? 0,
      corretas: dados?.corretas ?? 0,
      total: dados?.total ?? 0,
    };
  });

  if (carregando) {
    return <p className="text-sm text-muted">Carregando desempenho…</p>;
  }

  if (entradas.every((entrada) => entrada.total === 0)) {
    return <p className="text-sm text-muted">Responda algumas questões para ver seu desempenho por área.</p>;
  }

  return (
    <div
      role="img"
      aria-label={entradas
        .map((entrada) => `${entrada.rotulo} ${entrada.percentual}% de acerto`)
        .join(". ")}
    >
      <div className="h-[216px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entradas} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={14}>
            <CartesianGrid stroke="#E7E4D9" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              allowDecimals={false}
              tick={{ fill: "#6B6B63", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#E7E4D9" }}
            />
            <YAxis
              type="category"
              dataKey="rotulo"
              width={152}
              tick={{ fill: "#17170F", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TooltipArea />} cursor={{ fill: "#F7F6F1" }} />
            <Bar dataKey="percentual" radius={[0, 6, 6, 0]}>
              {entradas.map((entrada) => (
                <Cell key={entrada.area} fill={corPorDesempenho(entrada.percentual)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}