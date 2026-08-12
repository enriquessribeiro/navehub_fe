import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import type { PontoEvolucao } from "@/services/questionsService";

export const PERIODOS_EVOLUCAO = [7, 30, 90] as const;
export type PeriodoEvolucao = (typeof PERIODOS_EVOLUCAO)[number];

const COR_FEITAS = "#F2B705";
const COR_ACERTOS = "#1E8E5A";

function formatarDia(dia: string): string {
  const [, mes, diaDoMes] = dia.split("-");
  return `${diaDoMes}/${mes}`;
}

interface TooltipPayloadItem {
  value?: number;
  dataKey?: string;
  color?: string;
}

interface TooltipEvolucaoProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

function TooltipEvolucao({ active, payload, label }: TooltipEvolucaoProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-card">
      <p className="mb-1.5 font-mono text-xs text-muted">{label ? formatarDia(label) : ""}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey} className="flex items-center gap-2 text-xs text-ink">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.dataKey === "feitas" ? "Questões feitas" : "Acertos"}</span>
            <span className="ml-auto font-mono font-semibold">{item.value ?? 0}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

interface EvolucaoChartProps {
  dados: PontoEvolucao[];
  dias: PeriodoEvolucao;
  carregando?: boolean;
}

export function EvolucaoChart({ dados, dias, carregando = false }: EvolucaoChartProps) {
  const serie = useMemo(() => {
    const porDia = new Map(dados.map((ponto) => [ponto.dia, ponto]));
    const pontos: PontoEvolucao[] = [];
    const hoje = new Date();

    for (let i = dias - 1; i >= 0; i -= 1) {
      const data = new Date(hoje);
      data.setHours(0, 0, 0, 0);
      data.setDate(data.getDate() - i);
      const chaveDia = data.toISOString().slice(0, 10);
      pontos.push({
        dia: chaveDia,
        feitas: porDia.get(chaveDia)?.feitas ?? 0,
        acertos: porDia.get(chaveDia)?.acertos ?? 0,
      });
    }

    return pontos;
  }, [dados, dias]);

  const totais = useMemo(
    () =>
      serie.reduce(
        (acc, ponto) => ({ feitas: acc.feitas + ponto.feitas, acertos: acc.acertos + ponto.acertos }),
        { feitas: 0, acertos: 0 }
      ),
    [serie]
  );

  if (carregando) {
    return <p className="text-sm text-muted">Carregando evolução…</p>;
  }

  if (totais.feitas === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">Você ainda não respondeu questões nesse período.</p>
        <Link to="/questoes">
          <Button>Praticar agora</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Evolução nos últimos ${dias} dias: ${totais.feitas} questões respondidas, ${totais.acertos} acertos`}
    >
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_FEITAS }} />
          Questões feitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_ACERTOS }} />
          Acertos
        </span>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#E7E4D9" vertical={false} />
            <XAxis
              dataKey="dia"
              tickFormatter={formatarDia}
              tick={{ fill: "#6B6B63", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#E7E4D9" }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tick={{ fill: "#6B6B63", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TooltipEvolucao />} />
            <Area
              type="monotone"
              dataKey="feitas"
              name="Questões feitas"
              stroke={COR_FEITAS}
              strokeWidth={2}
              fill={COR_FEITAS}
              fillOpacity={0.15}
            />
            <Area
              type="monotone"
              dataKey="acertos"
              name="Acertos"
              stroke={COR_ACERTOS}
              strokeWidth={2}
              fill={COR_ACERTOS}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}