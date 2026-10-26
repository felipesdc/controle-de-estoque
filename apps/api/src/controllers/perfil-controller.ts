import { Request, Response } from "express";
import {
  createPerfil,
  deletePerfil,
  getAllPerfis,
  getPerfilById,
  updatePerfil,
} from "../models/perfil";

// Consultar todos os perfis
export const getPerfis = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfis = await getAllPerfis();
    res.json(perfis);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar perfis" });
  }
};

// Consultar um perfil específico
export const getPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfil = await getPerfilById(Number(req.params.perfil_id));
    if (perfil) {
      res.json(perfil);
    } else {
      res.status(404).json({ message: "Perfil não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
};

// Criar novo perfil
export const createNewPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { perfil_nome } = req.body;
    const newPerfil = await createPerfil(perfil_nome);
    res.status(201).json(newPerfil);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar perfil" });
  }
};

// Atualizar um perfil específico
export const updateExistingPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const perfil_id = Number(req.params.perfil_id);
    const { perfil_nome } = req.body;
    const updatedPerfil = await updatePerfil(perfil_id, perfil_nome);
    if (updatedPerfil) {
      res.json(updatedPerfil);
    } else {
      res.status(404).json({ message: "Perfil não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
};

// Deletar um perfil específico
export const deleteExistingPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const perfil_id = Number(req.params.perfil_id);
    await deletePerfil(perfil_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar perfil" });
  }
};
