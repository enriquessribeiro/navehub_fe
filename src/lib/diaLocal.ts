/**
 * Chave "yyyy-mm-dd" de um Date no FUSO LOCAL do navegador.
 *
 * O banco guarda instantes em UTC (timestamptz) e o gráfico de evolução
 * fatiava o ISO cru (`iso.slice(0, 10)`), que é o dia em UTC — em fusos
 * negativos (ex.: -03:00) toda atividade após 21h caía no "dia seguinte":
 * o eixo "hoje" ficava vazio e as barras, deslocadas. Usar as partes locais
 * (getFullYear/getMonth/getDate) alinha os dois lados da série (serviço que
 * agrupa as tentativas e gráfico que monta o eixo).
 */
export function chaveDiaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}