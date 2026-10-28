import pool from "../config/db";
import { EstoqueError } from "./estoque";
import { periodoValidade, validadeSql as validade, dataValidaSql as dataValida } from "./datas";

export function getCatalogo(input: Record<string, unknown>, now = new Date()) {
  const text = (name: string, fallback = "") => {
    const value = input[name] ?? fallback;
    if (typeof value !== "string") throw new EstoqueError(400, `Parâmetro ${name} inválido.`);
    return value.trim();
  };
  const choice = (name: string, choices: string[], fallback: string) => {
    const value = text(name, fallback);
    if (!choices.includes(value)) throw new EstoqueError(400, `Parâmetro ${name} inválido.`);
    return value;
  };
  const integer = (name: string, fallback: number) => {
    const value = text(name, String(fallback));
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new EstoqueError(400, `Parâmetro ${name} inválido.`);
    return Number(value);
  };
  const q = text("q");
  if (q.length > 100) throw new EstoqueError(400, "A busca deve ter até 100 caracteres.");
  const estado = choice("estado", ["ativos", "inativos", "todos"], "ativos");
  const estoque = choice("estoque", ["todos", "baixo", "zerado", "disponivel"], "todos");
  const vencimento = choice("vencimento", ["todos", "vencido", "em_breve", "sem_validade"], "todos");
  const ordem = choice("ordem", ["nome", "saldo", "validade", "recentes"], "nome");
  const direcao = choice("direcao", ["asc", "desc"], "asc");
  const tamanho = integer("tamanho", 10);
  if (![10, 25, 50].includes(tamanho)) throw new EstoqueError(400, "Tamanho deve ser 10, 25 ou 50.");
  const solicitada = integer("pagina", 1);
  const categoria = text("categoria");
  if (categoria && categoria !== "sem" && (!/^\d+$/.test(categoria) || !Number.isSafeInteger(Number(categoria)) || Number(categoria) < 1)) throw new EstoqueError(400, "Categoria inválida.");
  const { hoje, ate } = periodoValidade(now);
  const values: unknown[] = [];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  const conditions: string[] = [];
  if (estado !== "todos") conditions.push(`p.produto_estado = ${bind(estado === "ativos")}`);
  if (q) {
    const search = bind(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    conditions.push(`(p.produto_descricao LIKE ${search} ESCAPE '\\' OR p.produto_codigo_barras LIKE ${search} ESCAPE '\\' OR CAST(p.produto_id AS TEXT) = ${bind(q)})`);
  }
  if (categoria === "sem") conditions.push("p.produto_categoria_id IS NULL");
  else if (categoria) conditions.push(`p.produto_categoria_id = ${bind(Number(categoria))}`);
  if (estoque === "baixo") conditions.push("COALESCE(p.produto_quantidade_estoque,0) < 5");
  if (estoque === "zerado") conditions.push("COALESCE(p.produto_quantidade_estoque,0) = 0");
  if (estoque === "disponivel") conditions.push("p.produto_quantidade_estoque > 0");
  if (vencimento === "vencido") conditions.push(`${dataValida} AND p.produto_quantidade_estoque > 0 AND ${validade} < ${bind(hoje)}`);
  if (vencimento === "em_breve") conditions.push(`${dataValida} AND p.produto_quantidade_estoque > 0 AND ${validade} >= ${bind(hoje)} AND ${validade} <= ${bind(ate)}`);
  if (vencimento === "sem_validade") conditions.push(`NOT COALESCE(${dataValida}, 0)`);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orders = { nome: "p.produto_descricao COLLATE NOCASE", saldo: "COALESCE(p.produto_quantidade_estoque,0)", validade: validade, recentes: "p.produto_id" };
  const order = `${ordem === "validade" ? `CASE WHEN ${dataValida} THEN 0 ELSE 1 END ASC,` : ""} ${orders[ordem as keyof typeof orders]} ${direcao.toUpperCase()}, p.produto_id ASC`;
  return pool.transaction(execute => {
    const total = execute(`SELECT COUNT(*) AS total FROM pi2_produtos p ${where}`, values).rows[0].total;
    const paginas = Math.max(1, Math.ceil(total / tamanho));
    const pagina = Math.min(solicitada, paginas);
    const itens = execute(`SELECT p.*, c.categoria_descricao AS produto_categoria, u.unidade_descricao AS produto_unidade,
      CASE WHEN ${dataValida} THEN ${validade} ELSE NULL END AS validade_catalogo,
      CASE WHEN NOT COALESCE(${dataValida},0) THEN 'sem_validade' WHEN ${validade} < ${bind(hoje)} THEN 'vencido' WHEN ${validade} <= ${bind(ate)} THEN 'em_breve' ELSE 'regular' END AS situacao_validade
      FROM pi2_produtos p LEFT JOIN pi2_categorias c ON c.categoria_id = p.produto_categoria_id
      LEFT JOIN pi2_unidades u ON u.unidade_id = p.produto_unidade_id ${where}
      ORDER BY ${order} LIMIT ${bind(tamanho)} OFFSET ${bind((pagina - 1) * tamanho)}`, values).rows;
    return { itens, total, pagina, tamanho, paginas, criterios: { data_referencia: hoje, vencimento_ate: ate, estoque_baixo_abaixo_de: 5 } };
  });
}

// Only metadata is patchable here. Balance changes always belong to stock movements.
const fields = new Set(["produto_descricao", "produto_categoria_id", "produto_unidade_id", "produto_fornecedor_id", "produto_preco_id", "produto_data_validade", "produto_codigo_barras", "produto_estado"]);
export function patchProduto(id: number, body: unknown) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EstoqueError(400, "Produto inválido.");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new EstoqueError(400, "Dados do produto inválidos.");
  const entries = Object.entries(body);
  if (!entries.length || entries.some(([key]) => !fields.has(key))) throw new EstoqueError(400, "Envie apenas dados cadastrais. Altere o saldo por movimentações.");
  return pool.transaction(execute => {
    if (!execute("SELECT produto_id FROM pi2_produtos WHERE produto_id = $1", [id]).rows[0]) throw new EstoqueError(404, "Produto não encontrado.");
    const normalized = validarCamposProduto(execute, Object.fromEntries(entries));
    const names = Object.keys(normalized);
    return execute(`UPDATE pi2_produtos SET ${names.map((name, index) => `${name} = $${index + 2}`).join(", ")} WHERE produto_id = $1 RETURNING *`, [id, ...Object.values(normalized)]).rows[0];
  });
}

type Execute = Parameters<Parameters<typeof pool.transaction>[0]>[0];
export function validarCamposProduto(execute: Execute, body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  const refs: Record<string, [string, string]> = {
    produto_categoria_id: ["pi2_categorias", "categoria_id"], produto_unidade_id: ["pi2_unidades", "unidade_id"],
    produto_fornecedor_id: ["pi2_fornecedores", "fornecedor_id"], produto_preco_id: ["pi2_precos", "preco_id"],
  };
  for (const [key, value] of Object.entries(body)) {
    if (!fields.has(key)) continue;
    if (key === "produto_descricao") {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 200) throw new EstoqueError(400, "Informe uma descrição de até 200 caracteres.");
      result[key] = value.trim();
    } else if (key === "produto_estado") {
      if (typeof value !== "boolean") throw new EstoqueError(400, "O estado do produto deve ser verdadeiro ou falso.");
      result[key] = value;
    } else if (refs[key]) {
      if (value === null || value === undefined || value === "") result[key] = null;
      else {
        const [table, column] = refs[key];
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || !execute(`SELECT 1 FROM ${table} WHERE ${column} = $1`, [value]).rows.length) throw new EstoqueError(400, "Categoria, unidade, fornecedor ou preço inválido.");
        result[key] = value;
      }
    } else if (key === "produto_data_validade") {
      if (value === null || value === undefined || value === "") result[key] = null;
      else {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) throw new EstoqueError(400, "Informe uma validade no formato AAAA-MM-DD.");
        const date = value.slice(0, 10);
        const parsed = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new EstoqueError(400, "Data de validade inválida.");
        result[key] = date;
      }
    } else if (key === "produto_codigo_barras") {
      if (value === null || value === undefined || value === "") result[key] = null;
      else {
        if (typeof value !== "string" || value.length > 80) throw new EstoqueError(400, "O código deve ter até 80 caracteres.");
        result[key] = value.trim() || null;
      }
    }
  }
  return result;
}
