import { Request, Response } from "express";
import {
  createPedido,
  deletePedido,
  getAllPedidos,
  getPedidoById,
  updatePedido,
} from "../models/pedido";

// Consultar todos os pedidos
export const getPedidos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pedidos = await getAllPedidos();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar pedidos" });
  }
};

// Consultar um pedido específico
export const getPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const pedido = await getPedidoById(Number(req.params.pedido_id));
    if (pedido) {
      res.json(pedido);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar pedido" });
  }
};

// Criar um novo pedido
export const createNewPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total,
    } = req.body;
    const newPedido = await createPedido(
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total
    );
    res.status(201).json(newPedido);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar pedido" });
  }
};

// Atualizar um pedido específico
export const updateExistingPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pedido_id = Number(req.params.pedido_id);
    const {
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total,
    } = req.body;
    const updatedPedido = await updatePedido(
      pedido_id,
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total
    );
    if (updatedPedido) {
      res.json(updatedPedido);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar pedido" });
  }
};

// Deletar um pedido específico
export const deleteExistingPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pedido_id = Number(req.params.pedido_id);
    await deletePedido(pedido_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar pedido" });
  }
};
