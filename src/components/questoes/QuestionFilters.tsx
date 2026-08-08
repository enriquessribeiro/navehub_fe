import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ANOS_DISPONIVEIS } from "@/services/questionsService";
import type { AreaEnem } from "@/types/database.types";

export const ROTULOS_AREA: Record<AreaEnem, string> = {
  matematica: "Matemática",
  linguagens: "Linguagens",
  ciencias_humanas: "Ciências Humanas",
  ciencias_natureza: "Ciências da Natureza",
};

const OPCOES_IDIOMA: Array<{ valor: string; rotulo: string }> = [
  { valor: "portugues", rotulo: "Português" },
  { valor: "ingles", rotulo: "Inglês" },
  { valor: "espanhol", rotulo: "Espanhol" },
];

interface QuestionFiltersProps {
  ano: number | null;
  area: AreaEnem | null;
  idioma: string | null;
  onChangeAno: (valor: number | null) => void;
  onChangeArea: (valor: AreaEnem | null) => void;
  onChangeIdioma: (valor: string | null) => void;
  onBuscar: () => void;
  carregando?: boolean;
}

export function QuestionFilters({
  ano,
  area,
  idioma,
  onChangeAno,
  onChangeArea,
  onChangeIdioma,
  onBuscar,
  carregando,
}: QuestionFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <Select
        label="Ano"
        value={ano ?? ""}
        onChange={(e) => onChangeAno(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos</option>
        {ANOS_DISPONIVEIS.map((anoDisponivel) => (
          <option key={anoDisponivel} value={anoDisponivel}>
            {anoDisponivel}
          </option>
        ))}
      </Select>

      <Select
        label="Área"
        value={area ?? ""}
        onChange={(e) => onChangeArea((e.target.value || null) as AreaEnem | null)}
      >
        <option value="">Todas</option>
        {(Object.keys(ROTULOS_AREA) as AreaEnem[]).map((chave) => (
          <option key={chave} value={chave}>
            {ROTULOS_AREA[chave]}
          </option>
        ))}
      </Select>

      <Select label="Idioma" value={idioma ?? "portugues"} onChange={(e) => onChangeIdioma(e.target.value)}>
        {OPCOES_IDIOMA.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
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
