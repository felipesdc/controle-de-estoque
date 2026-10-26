import { Request, Response } from "express";
import {
  createCategoria,
  deleteCategoria,
  getAllCategorias,
  getCategoriaById,
  updateCategoria,
} from "../models/categoria";

// Consultar todas as categorias
export const getCategorias = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categorias = await getAllCategorias();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar categorias" });
  }
};

// Consultar uma categoria específica
export const getCategoria = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoria = await getCategoriaById(Number(req.params.categoria_id));
    if (categoria) {
      res.json(categoria);
    } else {
      res.status(404).json({ message: "Categoria não encontrada" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar categoria" });
  }
};

// Criar uma nova categoria
export const createNewCategoria = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoria_descricao } = req.body;
    const newCategoria = await createCategoria(categoria_descricao);
    res.status(201).json(newCategoria);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar categoria" });
  }
};

// Atualizar uma categoria específica
export const updateExistingCategoria = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoria_id = Number(req.params.categoria_id);
    const { categoria_descricao } = req.body;
    const updatedCategoria = await updateCategoria(
      categoria_id,
      categoria_descricao
    );
    if (updatedCategoria) {
      res.json(updatedCategoria);
    } else {
      res.status(404).json({ message: "Categoria não encontrada" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar categoria" });
  }
};

// Deletar uma categoria específico
export const deleteExistingCategoria = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoria_id = Number(req.params.categoria_id);
    await deleteCategoria(categoria_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar categoria" });
  }
};
