import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  createUsuario,
  deleteUsuario,
  getAllUsuarios,
  getUsuarioById,
  updateUsuario,
} from "../models/usuario";

// Consultar todos os usuários
export const getUsuarios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuarios = await getAllUsuarios();
    res.json(usuarios.map(({ usuario_password, ...usuario }) => usuario));
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
};

// Consultar um usuário específico
export const getUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuario = await getUsuarioById(Number(req.params.usuario_id));
    if (usuario) {
      const { usuario_password, ...publico } = usuario;
      res.json(publico);
    } else {
      res.status(404).json({ message: "Usuário não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
};

// Criar novo usuário
export const createNewUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      usuario_nome,
      usuario_email,
      usuario_password,
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status,
    } = req.body;
    const newUsuario = await createUsuario(
      usuario_nome,
      usuario_email,
      bcrypt.hashSync(usuario_password, 8),
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status
    );
    const { usuario_password: _password, ...publico } = newUsuario;
    res.status(201).json(publico);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
};

// Atualizar um usuário específico
export const updateExistingUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuario_id = Number(req.params.usuario_id);
    const {
      usuario_nome,
      usuario_email,
      usuario_password,
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status,
    } = req.body;
    const current = await getUsuarioById(usuario_id);
    if (!current) { res.status(404).json({ message: "Usuário não encontrado" }); return; }
    const updatedUsuario = await updateUsuario(
      usuario_id,
      usuario_nome,
      usuario_email,
      usuario_password ? bcrypt.hashSync(usuario_password, 12) : current.usuario_password,
      usuario_nome_completo,
      usuario_inscricao,
      usuario_perfil_id,
      usuario_status
    );
    if (updatedUsuario) {
      const { usuario_password: _password, ...publico } = updatedUsuario;
      res.json(publico);
    } else {
      res.status(404).json({ message: "Usuário não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar usuário" });
  }
};

// Deletar um usuário específico
export const deleteExistingUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuario_id = Number(req.params.usuario_id);
    await deleteUsuario(usuario_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário" });
  }
};

export const authenticateUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { usuario_login, usuario_password } = req.body;

  try {
    const usuarios = await getAllUsuarios();
    const usuario = usuarios.find(
      (u) =>
        u.usuario_email === usuario_login || u.usuario_nome === usuario_login
    );
    if (!usuario) {
      res.status(401).json({ message: "Usuário não encontrado" });
    } else {
      const isPasswordValid = await bcrypt.compare(
        usuario_password,
        usuario.usuario_password
      );

      if (!isPasswordValid || !usuario.usuario_status) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }

      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          usuario_perfil_id: usuario.usuario_perfil_id,
        },
        process.env.JWT_SECRET || "secreto",
        {
          expiresIn: "2h",
        }
      );

      res.json({ token });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
};
