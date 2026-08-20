import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ANOS_DISPONIVEIS } from "@/services/questionsService";
import type { AreaFiltro } from "@/services/questionsService";
import type { AreaEnem } from "@/types/database.types";

export const ROTULOS_AREA: Record<AreaEnem, string> = {
  matematica: "Matemática",
  linguagens: "Linguagens",
  ciencias_humanas: "Ciências Humanas",
  ciencias_natureza: "Ciências da Natureza",
};

/** Rótulo de cada opção do filtro de área (4 áreas reais + 2 idiomas). */
const ROTULOS_AREA_FILTRO: Record<AreaFiltro, string> = {
  ...ROTULOS_AREA,
  ingles: "Inglês",
  espanhol: "Espanhol",
};

interface QuestionFiltersProps {
  ano: number | null;
  area: AreaFiltro | null;
  materia: string | null;
  assunto: string | null;
  materias: string[];
  assuntos: string[];
  carregandoMaterias: boolean;
  carregandoAssuntos: boolean;
  onChangeAno: (valor: number | null) => void;
  onChangeArea: (valor: AreaFiltro | null) => void;
  onChangeMateria: (valor: string | null) => void;
  onChangeAssunto: (valor: string | null) => void;
  onBuscar: () => void;
  carregando?: boolean;
  /** Anos vindos do banco; sem ele, usa a lista estática de fallback. */
  anos?: number[];
}

export function QuestionFilters({
  ano,
  area,
  materia,
  assunto,
  materias,
  assuntos,
  carregandoMaterias,
  carregandoAssuntos,
  onChangeAno,
  onChangeArea,
  onChangeMateria,
  onChangeAssunto,
  onBuscar,
  carregando,
  anos,
}: QuestionFiltersProps) {
  const listaAnos = anos ?? ANOS_DISPONIVEIS;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Select
        label="Ano"
        value={ano ?? ""}
        onChange={(e) => onChangeAno(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos</option>
        {listaAnos.map((anoDisponivel) => (
          <option key={anoDisponivel} value={anoDisponivel}>
            {anoDisponivel}
          </option>
        ))}
      </Select>

      <Select
        label="Área"
        value={area ?? ""}
        onChange={(e) => onChangeArea((e.target.value || null) as AreaFiltro | null)}
      >
        <option value="">Todas</option>
        {(Object.keys(ROTULOS_AREA_FILTRO) as AreaFiltro[]).map((chave) => (
          <option key={chave} value={chave}>
            {ROTULOS_AREA_FILTRO[chave]}
          </option>
        ))}
      </Select>

      <Select
        label="Matéria"
        value={materia ?? ""}
        onChange={(e) => onChangeMateria(e.target.value || null)}
        disabled={carregandoMaterias}
      >
        <option value="">Todas</option>
        {materias.map((nome) => (
          <option key={nome} value={nome}>
            {nome}
          </option>
        ))}
      </Select>

      <Select
        label="Assunto"
        value={assunto ?? ""}
        onChange={(e) => onChangeAssunto(e.target.value || null)}
        disabled={carregandoAssuntos}
      >
        <option value="">Todos</option>
        {assuntos.map((nome) => (
          <option key={nome} value={nome}>
            {nome}
          </option>
        ))}
      </Select>

      <div className="flex items-end">
        <Button onClick={onBuscar} disabled={carregando} className="w-full">
          {carregando ? "Buscando…" : "Buscar questões"}
        </Button>
      </div>
    </div>
  );
}