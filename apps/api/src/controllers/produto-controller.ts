import { Response } from "express";
import { AuthenticatedRequest as Request } from "../middlewares/auth";
import { EstoqueError } from "../services/estoque";
import {
  createProduto,
  deleteProduto,
  getAllProdutos,
  getProdutoById,
  updateProduto,
} from "../models/produto";

// Consultar todos os produtos
export const getProdutos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const produtos = await getAllProdutos();
    res.json(produtos);
  } catch (error) {
    if (error instanceof EstoqueError) { res.status(error.status).json({ message: error.message }); return; }
    res.status(500).json({ message: "Erro ao buscar produtos" });
  }
};

// Consultar um produto específico
export const getProduto = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const produto = await getProdutoById(Number(req.params.produto_id));
    if (produto) {
      res.json(produto);
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  } catch (error) {
    if (error instanceof EstoqueError) { res.status(error.status).json({ message: error.message }); return; }
    res.status(500).json({ message: "Erro ao buscar produto" });
  }
};

// Criar novo produto
export const createNewProduto = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      produto_descricao,
      produto_fornecedor_id,
      produto_preco_id,
      produto_unidade_id,
      produto_categoria_id,
      produto_quantidade_estoque,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado,

    } = req.body;
    const newProduto = await createProduto(
      produto_descricao,
      produto_fornecedor_id || null,
      produto_preco_id || null,
      produto_unidade_id || null,
      produto_categoria_id || null,
      produto_quantidade_estoque ?? 0,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado ?? true,
      req.userId!
    );
    res.status(201).json(newProduto);
  } catch (error) {
    if (error instanceof EstoqueError) { res.status(error.status).json({ message: error.message }); return; }
    res.status(500).json({ message: "Erro ao criar produto" });
  }
};

// Atualizar um produto específico
export const updateExistingProduto = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const produto_id = Number(req.params.produto_id);
    const {
      produto_descricao,
      produto_fornecedor_id,
      produto_preco_id,
      produto_unidade_id,
      produto_categoria_id,
      produto_quantidade_estoque,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado,
    } = req.body;
    const updatedProduto = await updateProduto(
      produto_id,
      produto_descricao,
      produto_fornecedor_id || null,
      produto_preco_id || null,
      produto_unidade_id || null,
      produto_categoria_id || null,
      produto_quantidade_estoque,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado
    );
    if (updatedProduto) {
      res.json(updatedProduto);
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  } catch (error) {
    if (error instanceof EstoqueError) { res.status(error.status).json({ message: error.message }); return; }
    res.status(500).json({ message: "Erro ao atualizar produto" });
  }
};

// Deletar um produto específico
export const deleteExistingProduto = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const produto_id = Number(req.params.produto_id);
    await deleteProduto(produto_id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof EstoqueError) { res.status(error.status).json({ message: error.message }); return; }
    res.status(500).json({ message: "Erro ao deletar produto" });
  }
};
