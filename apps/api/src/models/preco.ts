import pool from "../config/db";

export type Preco = {
  preco_id: number;
  preco_compra: string;
  preco_venda: string;
  preco_data_inicial: string;
  preco_data_final: string;
};

// Consultar todos preços
export const getAllPrecos = async (): Promise<Preco[]> => {
  const res = await pool.query("SELECT * FROM pi2_precos");
  return res.rows;
};

// Consultar um preço específico
export const getPrecoById = async (preco_id: number): Promise<Preco> => {
  const res = await pool.query("SELECT * FROM pi2_precos WHERE preco_id = $1", [
    preco_id,
  ]);
  return res.rows[0];
};

// Criar novo preço
export const createPreco = async (
  preco_compra: string,
  preco_venda: string,
  preco_data_inicial: string,
  preco_data_final: string
): Promise<Preco> => {
  const res = await pool.query(
    "INSERT INTO pi2_precos (preco_compra, preco_venda, preco_data_inicial, preco_data_final) VALUES ($1, $2, $3, $4) RETURNING *",
    [preco_compra, preco_venda, preco_data_inicial, preco_data_final]
  );
  return res.rows[0];
};

// Atualizar um preço específico
export const updatePreco = async (
  preco_id: number,
  preco_compra: string,
  preco_venda: string,
  preco_data_inicial: string,
  preco_data_final: string
): Promise<Preco | null> => {
  const res = await pool.query(
    "UPDATE pi2_precos SET preco_compra = $2, preco_venda = $3, preco_data_inicial = $4, preco_data_final = $5 WHERE preco_id = $1 RETURNING *",
    [preco_id, preco_compra, preco_venda, preco_data_inicial, preco_data_final]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um preço
export const deletePreco = async (preco_id: number): Promise<void> => {
  await pool.query("DELETE FROM pi2_precos WHERE preco_id = $1", [preco_id]);
};
