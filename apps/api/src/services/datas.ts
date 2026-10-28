export function periodoValidade(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const hoje = `${part("year")}-${part("month")}-${part("day")}`;
  const limite = new Date(`${hoje}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 30);
  return { hoje, ate: limite.toISOString().slice(0, 10) };
}
// Internal SQL expression; never interpolate user input here.
export const validadeSql = "substr(p.produto_data_validade, 1, 10)";
export const dataValidaSql = `(${validadeSql} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(${validadeSql}, '+0 days') = ${validadeSql})`;
