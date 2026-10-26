import pool from "../config/db";

export type Usuario = {
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  usuario_password: string;
  usuario_nome_completo: string;
  usuario_inscricao: Date;
  usuario_perfil_id: number;
  usuario_status: boolean;
};

// Consultar todos os usuários
export const getAllUsuarios = async (): Promise<Usuario[]> => {
  const res = await pool.query("SELECT * FROM pi2_usuarios");
  return res.rows;
};

// Consultar um usuário específico
export const getUsuarioById = async (usuario_id: number): Promise<Usuario> => {
  const res = await pool.query(
    "SELECT * FROM pi2_usuarios WHERE usuario_id = $1",
    [usuario_id]
  );
  return res.rows[0];
};

// Criar novo usuário
export const createUsuario = async (
  usuario_nome: string,
  usuario_email: string,
  usuario_password: string,
  usuario_nome_completo: string,
  usuario_inscricao: Date,
  usuario_perfil_id: number,
  usuario_status: boolean
): Promise<Usuario> => {
  const res = await pool.query(
    "INSERT INTO pi2_usuarios (usuario_nome, usuario_email, usuario_password, usuario_nome_completo, usuario_inscricao, usuario_perfil_id, usuario_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      usuario_nome,
      usuario_email,
      usuario_password,
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status,
    ]
  );
  return res.rows[0];
};

// Atualizar um usuário específico
export const updateUsuario = async (
  usuario_id: number,
  usuario_nome: string,
  usuario_email: string,
  usuario_password: string,
  usuario_nome_completo: string,
  usuario_inscricao: Date,
  usuario_perfil_id: number,
  usuario_status: boolean
): Promise<Usuario | null> => {
  const res = await pool.query(
    "UPDATE pi2_usuarios SET usuario_nome = $2, usuario_email = $3, usuario_password = $4, usuario_nome_completo = $5, usuario_inscricao = $6, usuario_perfil_id = $7, usuario_status = $8 WHERE usuario_id = $1 RETURNING *",
    [
      usuario_id,
      usuario_nome,
      usuario_email,
      usuario_password,
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status,
    ]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um usuário
export const deleteUsuario = async (usuario_id: number): Promise<void> => {
  await pool.query("UPDATE pi2_usuarios SET usuario_status = 0 WHERE usuario_id = $1", [
    usuario_id,
  ]);
};
