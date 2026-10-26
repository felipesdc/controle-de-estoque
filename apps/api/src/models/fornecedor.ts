import pool from "../config/db";

export type Fornecedor = {
  fornecedor_id: number;
  fornecedor_nome: string;
  fornecedor_contato: string;
  fornecedor_endereco: string;
};

// Consultar todos os forncedores
export const getAllFornecedores = async (): Promise<Fornecedor[]> => {
  const res = await pool.query("SELECT * FROM pi2_fornecedores");
  return res.rows;
};

// Consultar um fornecedor específico
export const getFornecedorById = async (
  fornecedor_id: number
): Promise<Fornecedor> => {
  const res = await pool.query(
    "SELECT * FROM pi2_fornecedores WHERE fornecedor_id = $1",
    [fornecedor_id]
  );
  return res.rows[0];
};

// Criar novo fornecedor
export const createFornecedor = async (
  fornecedor_nome: string,
  fornecedor_contato: string,
  fornecedor_endereco: string
): Promise<Fornecedor> => {
  const res = await pool.query(
    "INSERT INTO pi2_fornecedores (fornecedor_nome, fornecedor_contato, fornecedor_endereco) VALUES ($1, $2, $3) RETURNING *",
    [fornecedor_nome, fornecedor_contato, fornecedor_endereco]
  );
  return res.rows[0];
};

// Atualizar um fornecedor específico
export const updateFornecedor = async (
  fornecedor_id: number,
  fornecedor_nome: string,
  fornecedor_contato: string,
  fornecedor_endereco: string
): Promise<Fornecedor | null> => {
  const res = await pool.query(
    "UPDATE pi2_fornecedores SET fornecedor_nome = $2, fornecedor_contato = $3, fornecedor_endereco = $4 WHERE fornecedor_id = $1 RETURNING *",
    [fornecedor_id, fornecedor_nome, fornecedor_contato, fornecedor_endereco]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um fornecedor
export const deleteFornecedor = async (
  fornecedor_id: number
): Promise<void> => {
  await pool.query("DELETE FROM pi2_fornecedores WHERE fornecedor_id = $1", [
    fornecedor_id,
  ]);
};
