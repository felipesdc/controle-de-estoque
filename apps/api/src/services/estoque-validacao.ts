export class EstoqueError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function quantidade(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e9 || Math.abs(value * 1000 - Math.round(value * 1000)) > 0.00001) {
    throw new EstoqueError(400, "Informe uma quantidade de até 1 bilhão, com no máximo três casas decimais.");
  }
  return value;
}
