import pool from "../config/db";

export type Unidade = {
  unidade_id: number;
  unidade_descricao: string;
};

// Consultar todas as unidades
export const getAllUnidades = async (): Promise<Unidade[]> => {
  const res = await pool.query("SELECT * FROM pi2_unidades");
  return res.rows;
};

// Consultar uma unidade específica
export const getUnidadeById = async (unidade_id: number): Promise<Unidade> => {
  const res = await pool.query(
    "SELECT * FROM pi2_unidades WHERE unidade_id = $1",
    [unidade_id]
  );
  return res.rows[0];
};

// Criar nova unidade
export const createUnidade = async (
  unidade_descricao: string
): Promise<Unidade> => {
  const res = await pool.query(
    "INSERT INTO pi2_unidades (unidade_descricao) VALUES ($1) RETURNING *",
    [unidade_descricao]
  );
  return res.rows[0];
};

// Atualizar uma unidade específico
export const updateUnidade = async (
  unidade_id: number,
  unidade_descricao: string
): Promise<Unidade | null> => {
  const res = await pool.query(
    "UPDATE pi2_unidades SET unidade_descricao = $2 WHERE unidade_id = $1 RETURNING *",
    [unidade_id, unidade_descricao]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar uma unidade
export const deleteUnidade = async (unidade_id: number): Promise<void> => {
  await pool.query("DELETE FROM pi2_unidades WHERE unidade_id = $1", [
    unidade_id,
  ]);
};
