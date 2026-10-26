import { Request, Response } from "express";
import {
  createEstadoPedido,
  deleteEstadoPedido,
  getAllEstadosPedido,
  getEstadoPedidoById,
  updateEstadoPedido,
} from "../models/estado-pedido";

// Consultar todos os estados de pedido
export const getEstadosPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const estadosPedido = await getAllEstadosPedido();
    res.json(estadosPedido);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar estados de pedido" });
  }
};

// Consultar um estado de pedido específico
export const getEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const estadoPedido = await getEstadoPedidoById(
      Number(req.params.estado_pedido_id)
    );
    if (estadoPedido) {
      res.json(estadoPedido);
    } else {
      res.status(404).json({ message: "Estado de pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar estado de pedido" });
  }
};

// Criar um novo estado de pedido
export const createNewEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { estado_pedido_descricao } = req.body;
    const newEstadoPedido = await createEstadoPedido(estado_pedido_descricao);
    res.status(201).json(newEstadoPedido);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar estado de pedido" });
  }
};

// Atualizar um estado de pedido específico
export const updateExistingEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const estado_pedido_id = Number(req.params.estado_pedido_id);
    const { estado_pedido_descricao } = req.body;
    const updatedEstadoPedido = await updateEstadoPedido(
      estado_pedido_id,
      estado_pedido_descricao
    );
    if (updatedEstadoPedido) {
      res.json(updatedEstadoPedido);
    } else {
      res.status(404).json({ message: "Estado de pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar estado de pedido" });
  }
};

// Deletar um estado de pedido específico
export const deleteExistingEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const estado_pedido_id = Number(req.params.estado_pedido_id);
    await deleteEstadoPedido(estado_pedido_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar estado de pedido" });
  }
};
