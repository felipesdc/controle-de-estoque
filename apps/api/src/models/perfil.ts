import pool from "../config/db";

export type Perfil = {
  perfil_id: number;
  perfil_nome: string;
};

// Consultar todos os perfis
export const getAllPerfis = async (): Promise<Perfil[]> => {
  const res = await pool.query("SELECT * FROM pi2_perfis");
  return res.rows;
};

// Consultar um perfil específico
export const getPerfilById = async (perfil_id: number): Promise<Perfil> => {
  const res = await pool.query(
    "SELECT * FROM pi2_perfis WHERE perfil_id = $1",
    [perfil_id]
  );
  return res.rows[0];
};

// Criar novo perfil
export const createPerfil = async (perfil_nome: string): Promise<Perfil> => {
  const res = await pool.query(
    "INSERT INTO pi2_perfis (perfil_nome) VALUES ($1) RETURNING *",
    [perfil_nome]
  );
  return res.rows[0];
};

// Atualizar um perfil específico
export const updatePerfil = async (
  perfil_id: number,
  perfil_nome: string
): Promise<Perfil | null> => {
  const res = await pool.query(
    "UPDATE pi2_perfis SET perfil_nome = $2 WHERE perfil_id = $1 RETURNING *",
    [perfil_id, perfil_nome]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um perfil
export const deletePerfil = async (perfil_id: number): Promise<void> => {
  await pool.query("DELETE FROM pi2_perfis WHERE perfil_id = $1", [perfil_id]);
};
