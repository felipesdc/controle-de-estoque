import { Request, Response } from "express";
import {
  createPreco,
  deletePreco,
  getAllPrecos,
  getPrecoById,
  updatePreco,
} from "../models/preco";

// Consultar todos os preços
export const getPrecos = async (req: Request, res: Response): Promise<void> => {
  try {
    const precos = await getAllPrecos();
    res.json(precos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar preços" });
  }
};

// Consultar um preço específico
export const getPreco = async (req: Request, res: Response): Promise<void> => {
  try {
    const preco = await getPrecoById(Number(req.params.preco_id));
    if (preco) {
      res.json(preco);
    } else {
      res.status(404).json({ message: "Preço não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar preço" });
  }
};

// Criar novo preço
export const createNewPreco = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { preco_compra, preco_venda, preco_data_inicial, preco_data_final } =
      req.body;
    const newPreco = await createPreco(
      preco_compra,
      preco_venda,
      preco_data_inicial,
      preco_data_final
    );
    res.status(201).json(newPreco);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar preço" });
  }
};

// Atualizar um preço específico
export const updateExistingPreco = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const preco_id = Number(req.params.preco_id);
    const { preco_compra, preco_venda, preco_data_inicial, preco_data_final } =
      req.body;
    const updatedPreco = await updatePreco(
      preco_id,
      preco_compra,
      preco_venda,
      preco_data_inicial,
      preco_data_final
    );
    if (updatedPreco) {
      res.json(updatedPreco);
    } else {
      res.status(404).json({ message: "Preço não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar preço" });
  }
};

// Deletar um preço específico
export const deleteExistingPreco = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const preco_id = Number(req.params.preco_id);
    await deletePreco(preco_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar preço" });
  }
};
