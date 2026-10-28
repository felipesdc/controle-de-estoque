import pool from "../config/db";
import { EstoqueError } from "./estoque";

const configs = {
  categorias: { table: "pi2_categorias", id: "categoria_id", name: "categoria_descricao", max: 120,
    refs: [["pi2_produtos", "produto_categoria_id", "produtos"]] },
  unidades: { table: "pi2_unidades", id: "unidade_id", name: "unidade_descricao", max: 120,
    refs: [["pi2_produtos", "produto_unidade_id", "produtos"], ["pi2_itens_pedido", "item_pedido_unidade_id", "itens_pedido"]] },
  fornecedores: { table: "pi2_fornecedores", id: "fornecedor_id", name: "fornecedor_nome", max: 200,
    refs: [["pi2_produtos", "produto_fornecedor_id", "produtos"], ["pi2_pedidos", "pedido_fornecedor_id", "pedidos"]] },
} as const;
export type TipoCadastro = keyof typeof configs;
export function tipoCadastro(value: string): TipoCadastro {
  if (!Object.prototype.hasOwnProperty.call(configs, value)) throw new EstoqueError(404, "Cadastro não encontrado.");
  return value as TipoCadastro;
}
function idValido(value: unknown): number {
  if ((typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new EstoqueError(400, "Identificador inválido.");
  return Number(value);
}
const chave = (value: unknown) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const counts = (tipo: TipoCadastro) => configs[tipo].refs.map(([table, field, alias]) => `(SELECT COUNT(*) FROM ${table} r WHERE r.${field} = c.${configs[tipo].id}) AS ${alias}`).join(", ");
const project = (tipo: TipoCadastro, row: Record<string, any>) => {
  const c = configs[tipo];
  const refs = Object.fromEntries(c.refs.map(([, , alias]) => [alias, row[alias]]));
  return { id: row[c.id], nome: row[c.name], contato: row.fornecedor_contato || "", endereco: row.fornecedor_endereco || "", ...refs,
    total_vinculos: Object.values(refs).reduce((sum: number, value) => sum + Number(value), 0) };
};
function rowSql(tipo: TipoCadastro) { const c = configs[tipo]; return `SELECT c.*, ${counts(tipo)} FROM ${c.table} c`; }
type Execute = Parameters<Parameters<typeof pool.transaction>[0]>[0];
function obter(execute: Execute, tipo: TipoCadastro, id: number) {
  const row = execute(`${rowSql(tipo)} WHERE c.${configs[tipo].id} = $1`, [id]).rows[0];
  if (!row) throw new EstoqueError(404, "Registro não encontrado.");
  return row;
}
export function lerCadastro(tipo: TipoCadastro, value?: unknown, legado = false) {
  return pool.transaction(execute => {
    if (value !== undefined) { const row = obter(execute, tipo, idValido(value)); return legado ? row : project(tipo, row); }
    const c = configs[tipo];
    return execute(`${rowSql(tipo)} ORDER BY c.${c.name} COLLATE NOCASE ASC, c.${c.id} ASC`).rows.map(row => legado ? row : project(tipo, row));
  });
}
export function listarCadastro(tipo: TipoCadastro, params: Record<string, unknown>) {
  const text = (key: string, fallback = "") => { const v = params[key] ?? fallback; if (typeof v !== "string") throw new EstoqueError(400, `Parâmetro ${key} inválido.`); return v.trim(); };
  const q = text("q");
  if (q.length > 100) throw new EstoqueError(400, "A busca deve ter até 100 caracteres.");
  const pagina = idValido(text("pagina", "1"));
  const tamanho = idValido(text("tamanho", "10"));
  if (![10,25,50].includes(tamanho)) throw new EstoqueError(400, "Tamanho deve ser 10, 25 ou 50.");
  const c = configs[tipo];
  const columns = tipo === "fornecedores" ? [c.name, "fornecedor_contato", "fornecedor_endereco"] : [c.name];
  const values = q ? [`%${q.replace(/[\\%_]/g, "\\$&")}%`] : [];
  const where = q ? `WHERE (${columns.map(column => `c.${column} LIKE $1 ESCAPE '\\'`).join(" OR ")})` : "";
  return pool.transaction(execute => {
    const total = execute(`SELECT COUNT(*) AS total FROM ${c.table} c ${where}`, values).rows[0].total;
    const atual = Math.min(pagina, Math.max(1, Math.ceil(total / tamanho)));
    const itens = execute(`${rowSql(tipo)} ${where} ORDER BY c.${c.name} COLLATE NOCASE ASC, c.${c.id} ASC LIMIT $${values.length+1} OFFSET $${values.length+2}`, [...values, tamanho, (atual-1)*tamanho]).rows.map(row => project(tipo, row));
    return { itens, total, pagina: atual, tamanho };
  });
}
function campos(tipo: TipoCadastro, body: unknown, criar: boolean, legado: boolean, id?: number) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new EstoqueError(400, "Dados inválidos.");
  const c = configs[tipo];
  const mapping: Record<string,string> = legado ? { [c.name]: "nome", ...(tipo === "fornecedores" ? { fornecedor_contato: "contato", fornecedor_endereco: "endereco" } : {}) } : { nome: "nome", ...(tipo === "fornecedores" ? { contato: "contato", endereco: "endereco" } : {}) };
  const output: Record<string,string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (legado && key === c.id && id !== undefined && Number(value) === id) continue;
    if (!Object.prototype.hasOwnProperty.call(mapping, key)) throw new EstoqueError(400, "Envie apenas os campos deste cadastro.");
    const name = mapping[key];
    if (name === "nome") {
      if (typeof value !== "string") throw new EstoqueError(400, "Informe um nome válido.");
      const normalized = value.trim().replace(/\s+/g," ");
      if (!normalized || normalized.length > c.max) throw new EstoqueError(400, `O nome deve ter de 1 a ${c.max} caracteres.`);
      output.nome = normalized;
    } else {
      if (value !== null && typeof value !== "string") throw new EstoqueError(400, "Contato e endereço devem ser texto.");
      const normalized = value === null ? "" : (value as string).trim();
      const max = name === "contato" ? 200 : 500;
      if (normalized.length > max) throw new EstoqueError(400, `${name === "contato" ? "Contato" : "Endereço"} deve ter até ${max} caracteres.`);
      output[name] = normalized;
    }
  }
  if (criar && !output.nome) throw new EstoqueError(400, "Informe o nome do cadastro.");
  if (!criar && !Object.keys(output).length) throw new EstoqueError(400, "Informe ao menos um campo para atualizar.");
  if (criar && tipo === "fornecedores") { output.contato ??= ""; output.endereco ??= ""; }
  return output;
}
export function salvarCadastro(tipo: TipoCadastro, body: unknown, value?: unknown, legado = false) {
  const id = value === undefined ? undefined : idValido(value);
  const data = campos(tipo, body, id === undefined, legado, id);
  const c = configs[tipo];
  return pool.transaction(execute => {
    const current = id === undefined ? undefined : obter(execute, tipo, id);
    if (data.nome && (!current || chave(data.nome) !== chave(current[c.name]))) {
      const duplicate = execute(`SELECT ${c.id}, ${c.name} FROM ${c.table}`).rows.some(row => row[c.id] !== id && chave(row[c.name] || "") === chave(data.nome));
      if (duplicate) throw new EstoqueError(409, "Já existe um cadastro com este nome.");
    }
    const names: Record<string,string> = { nome: c.name, contato: "fornecedor_contato", endereco: "fornecedor_endereco" };
    const keys = Object.keys(data);
    const row = id === undefined
      ? execute(`INSERT INTO ${c.table} (${keys.map(k=>names[k]).join(",")}) VALUES (${keys.map((_, i)=>`$${i+1}`).join(",")}) RETURNING *`, Object.values(data)).rows[0]
      : execute(`UPDATE ${c.table} SET ${keys.map((k,i)=>`${names[k]} = $${i+2}`).join(",")} WHERE ${c.id} = $1 RETURNING *`, [id, ...Object.values(data)]).rows[0];
    const result = obter(execute, tipo, row[c.id]);
    return legado ? result : project(tipo, result);
  });
}
export function excluirCadastro(tipo: TipoCadastro, value: unknown) {
  const id = idValido(value); const c = configs[tipo];
  pool.transaction(execute => {
    const row = project(tipo, obter(execute, tipo, id));
    if (row.total_vinculos > 0) throw new EstoqueError(409, "Este cadastro está em uso por produtos ou pedidos. Remova os vínculos antes de excluir; registros históricos também são preservados.");
    execute(`DELETE FROM ${c.table} WHERE ${c.id} = $1`, [id]);
  });
}
