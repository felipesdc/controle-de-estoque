import { Request, Response } from "express";
import {
  createHistoricoEstadoPedido,
  deleteHistoricoEstadoPedido,
  getAllHistoricosEstadoPedido,
  getHistoricoEstadoPedidoById,
  updateHistoricoEstadoPedido,
} from "../models/historico-estado-pedido";

// Consultar todos os históricos de estados de pedido
export const getHistoricosEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const historicosEstadoPedido = await getAllHistoricosEstadoPedido();
    res.json(historicosEstadoPedido);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar históricos de estados de pedido" });
  }
};

// Consultar um histórico de estado de pedido específico
export const getHistoricoEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const historicoEstadoPedido = await getHistoricoEstadoPedidoById(
      Number(req.params.historico_id)
    );
    if (historicoEstadoPedido) {
      res.json(historicoEstadoPedido);
    } else {
      res
        .status(404)
        .json({ message: "Histórico de estado de pedido não encontrado" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar histórico de estado de pedido" });
  }
};

// Criar um novo histórico de estado de pedido
export const createNewHistoricoEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao,
    } = req.body;
    const newHistoricoEstadoPedido = await createHistoricoEstadoPedido(
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao
    );
    res.status(201).json(newHistoricoEstadoPedido);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao criar histórico de estado de pedido" });
  }
};

// Atualizar um histórico de estado de pedido específico
export const updateExistingHistoricoEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const historico_id = Number(req.params.historico_id);
    const {
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao,
    } = req.body;
    const updatedHistoricoEstadoPedido = await updateHistoricoEstadoPedido(
      historico_id,
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao
    );
    if (updatedHistoricoEstadoPedido) {
      res.json(updatedHistoricoEstadoPedido);
    } else {
      res
        .status(404)
        .json({ message: "Histórico de estado de pedido não encontrado" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao atualizar histórico de estado de pedido" });
  }
};

// Deletar um histórico de estado de pedido específico
export const deleteExistingHistoricoEstadoPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const historico_id = Number(req.params.historico_id);
    await deleteHistoricoEstadoPedido(historico_id);
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao deletar histórico de estado de pedido" });
  }
};
