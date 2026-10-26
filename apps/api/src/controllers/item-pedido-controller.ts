import { Request, Response } from "express";
import {
  createItemPedido,
  deleteItemPedido,
  getAllItensPedido,
  getItemPedidoById,
  updateItemPedido,
} from "../models/item-pedido";

// Consultar todos os itens de pedido
export const getItensPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itensPedido = await getAllItensPedido();
    res.json(itensPedido);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar itens de pedido" });
  }
};

// Consultar um item de pedido específico
export const getItemPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemPedido = await getItemPedidoById(
      Number(req.params.item_pedido_id)
    );
    if (itemPedido) {
      res.json(itemPedido);
    } else {
      res.status(404).json({ message: "Item de pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar item de pedido" });
  }
};

// Criar um novo item de pedido
export const createNewItemPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total,
    } = req.body;
    const newItemPedido = await createItemPedido(
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total
    );
    res.status(201).json(newItemPedido);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar item de pedido" });
  }
};

// Atualizar um item de pedido específico
export const updateExistingItemPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const item_pedido_id = Number(req.params.item_pedido_id);
    const {
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total,
    } = req.body;
    const updatedItemPedido = await updateItemPedido(
      item_pedido_id,
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total
    );
    if (updatedItemPedido) {
      res.json(updatedItemPedido);
    } else {
      res.status(404).json({ message: "Item de pedido não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar item de pedido" });
  }
};

// Deletar um item de pedido específico
export const deleteExistingItemPedido = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const item_pedido_id = Number(req.params.item_pedido_id);
    await deleteItemPedido(item_pedido_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar item de pedido" });
  }
};
