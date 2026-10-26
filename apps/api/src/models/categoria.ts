import pool from "../config/db";

export type Categoria = {
  categoria_id: number;
  categoria_descricao: string;
};

// Consultar todas as categorias
export const getAllCategorias = async (): Promise<Categoria[]> => {
  const res = await pool.query("SELECT * FROM pi2_categorias");
  return res.rows;
};

// Consultar uma categoria específica
export const getCategoriaById = async (
  categoria_id: number
): Promise<Categoria> => {
  const res = await pool.query(
    "SELECT * FROM pi2_categorias WHERE categoria_id = $1",
    [categoria_id]
  );
  return res.rows[0];
};

// Criar nova categoria
export const createCategoria = async (
  categoria_descricao: string
): Promise<Categoria> => {
  const res = await pool.query(
    "INSERT INTO pi2_categorias (categoria_descricao) VALUES ($1) RETURNING *",
    [categoria_descricao]
  );
  return res.rows[0];
};

// Atualizar uma categoria específico
export const updateCategoria = async (
  categoria_id: number,
  categoria_descricao: string
): Promise<Categoria | null> => {
  const res = await pool.query(
    "UPDATE pi2_categorias SET categoria_descricao = $2 WHERE categoria_id = $1 RETURNING *",
    [categoria_id, categoria_descricao]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar uma categoria
export const deleteCategoria = async (categoria_id: number): Promise<void> => {
  await pool.query("DELETE FROM pi2_categorias WHERE categoria_id = $1", [
    categoria_id,
  ]);
};
