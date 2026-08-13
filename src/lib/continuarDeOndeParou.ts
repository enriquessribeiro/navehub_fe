import type { AreaFiltro } from "@/services/questionsService";

/**
 * "Continuar de onde parou" — decisão registrada no planejamento: em vez de
 * uma lógica de recomendação (fora do escopo do MVP), guardamos localmente
 * o último filtro/questão que o aluno usou e oferecemos um atalho direto
 * pra continuar dali. Implementação deliberadamente simples: localStorage,
 * sem tabela nova no banco.
 */
export interface UltimaAtividade {
  /** Área filtrada — inclui os idiomas extras ("ingles"/"espanhol"). */
  area: AreaFiltro | null;
  ano: number | null;
  atualizadoEm: string;
}

function storageKey(alunoId: string): string {
  return `navehub:continuar-de-onde-parou:${alunoId}`;
}

export function salvarUltimaAtividade(alunoId: string, atividade: Omit<UltimaAtividade, "atualizadoEm">): void {
  try {
    const payload: UltimaAtividade = { ...atividade, atualizadoEm: new Date().toISOString() };
    window.localStorage.setItem(storageKey(alunoId), JSON.stringify(payload));
  } catch {
    // localStorage pode falhar (modo privado, quota cheia etc.) — não é
    // crítico para o funcionamento do app, então apenas ignoramos.
  }
}

export function lerUltimaAtividade(alunoId: string): UltimaAtividade | null {
  try {
    const raw = window.localStorage.getItem(storageKey(alunoId));
    if (!raw) return null;
    return JSON.parse(raw) as UltimaAtividade;
  } catch {
    return null;
  }
}
