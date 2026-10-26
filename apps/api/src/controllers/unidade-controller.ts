import { Request, Response } from "express";
import {
  createUnidade,
  deleteUnidade,
  getAllUnidades,
  getUnidadeById,
  updateUnidade,
} from "../models/unidade";

// Consultar todas as unidades
export const getUnidades = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const unidades = await getAllUnidades();
    res.json(unidades);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar unidades" });
  }
};

// Consultar uma unidade específica
export const getUnidade = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const unidade = await getUnidadeById(Number(req.params.unidade_id));
    if (unidade) {
      res.json(unidade);
    } else {
      res.status(404).json({ message: "Unidade não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar unidade" });
  }
};

// Criar uma nova unidade
export const createNewUnidade = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { unidade_descricao } = req.body;
    const newUnidade = await createUnidade(unidade_descricao);
    res.status(201).json(newUnidade);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar unidade" });
  }
};

// Atualizar uma unidade específica
export const updateExistingUnidade = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const unidade_id = Number(req.params.unidade_id);
    const { unidade_descricao } = req.body;
    const updatedUnidade = await updateUnidade(unidade_id, unidade_descricao);
    if (updatedUnidade) {
      res.json(updatedUnidade);
    } else {
      res.status(404).json({ message: "Unidade não encontrada" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar unidade" });
  }
};

// Deletar uma unidade específico
export const deleteExistingUnidade = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const unidade_id = Number(req.params.unidade_id);
    await deleteUnidade(unidade_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar unidade" });
  }
};
