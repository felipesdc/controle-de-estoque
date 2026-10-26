import pool from "../config/db";
import { EstoqueError, quantidade, registrar } from "../services/estoque";
import { randomUUID } from "node:crypto";

export type Produto = {
  produto_id: number;
  produto_descricao: string;
  produto_fornecedor_id: number;
  produto_preco_id: number;
  produto_unidade_id: number;
  produto_categoria_id: number;
  produto_quantidade_estoque: number;
  produto_data_validade: Date;
  produto_codigo_barras: string;
  produto_estado: boolean;
};

// Consultar todos os produtos
export const getAllProdutos = async (): Promise<Produto[]> => {
  const res = await pool.query("SELECT * FROM pi2_produtos");
  return res.rows;
};

// Consultar um produto específico
export const getProdutoById = async (produto_id: number): Promise<Produto> => {
  const res = await pool.query(
    "SELECT * FROM pi2_produtos WHERE produto_id = $1",
    [produto_id]
  );
  return res.rows[0];
};

// Criar novo produto
export const createProduto = async (
  produto_descricao: string,
  produto_fornecedor_id: number,
  produto_preco_id: number,
  produto_unidade_id: number,
  produto_categoria_id: number,
  produto_quantidade_estoque: number,
  produto_data_validade: Date,
  produto_codigo_barras: string,
  produto_estado: boolean,
  usuarioId: number
): Promise<Produto> => {
  if (typeof produto_descricao !== "string" || !produto_descricao.trim() || produto_descricao.length > 200) throw new EstoqueError(400, "Informe uma descrição de até 200 caracteres.");
  quantidade(produto_quantidade_estoque);
  return pool.transaction(execute => {
  const res = execute(
    "INSERT INTO pi2_produtos (produto_descricao, produto_fornecedor_id, produto_preco_id, produto_unidade_id, produto_categoria_id, produto_quantidade_estoque, produto_data_validade, produto_codigo_barras, produto_estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [
      produto_descricao,
      produto_fornecedor_id,
      produto_preco_id,
      produto_unidade_id,
      produto_categoria_id,
      0,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado,
    ]
  );
  const row = res.rows[0];
  if (produto_quantidade_estoque > 0) registrar(execute, row.produto_id, produto_quantidade_estoque, "entrada", "Saldo inicial", usuarioId, randomUUID());
  return execute("SELECT * FROM pi2_produtos WHERE produto_id = $1", [row.produto_id]).rows[0];
  });
};

// Atualizar um produto específico
export const updateProduto = async (
  produto_id: number,
  produto_descricao: string,
  produto_fornecedor_id: number,
  produto_preco_id: number,
  produto_unidade_id: number,
  produto_categoria_id: number,
  produto_quantidade_estoque: number,
  produto_data_validade: Date,
  produto_codigo_barras: string,
  produto_estado: boolean
): Promise<Produto | null> => {
  if (typeof produto_descricao !== "string" || !produto_descricao.trim() || produto_descricao.length > 200) throw new EstoqueError(400, "Informe uma descrição de até 200 caracteres.");
  return pool.transaction(execute => {
  const current = execute("SELECT * FROM pi2_produtos WHERE produto_id = $1", [produto_id]).rows[0];
  if (!current) return null;
  if (produto_quantidade_estoque !== current.produto_quantidade_estoque) throw new EstoqueError(409, "Altere o saldo por uma movimentação de estoque.");
  const res = execute(
    "UPDATE pi2_produtos SET produto_descricao = $2, produto_fornecedor_id = $3, produto_preco_id = $4, produto_unidade_id = $5, produto_categoria_id = $6, produto_quantidade_estoque = $7, produto_data_validade = $8, produto_codigo_barras = $9, produto_estado = $10 WHERE produto_id = $1 RETURNING *",
    [
      produto_id,
      produto_descricao,
      produto_fornecedor_id,
      produto_preco_id,
      produto_unidade_id,
      produto_categoria_id,
      produto_quantidade_estoque,
      produto_data_validade,
      produto_codigo_barras,
      produto_estado,
    ]
  );
  return res.rows.length ? res.rows[0] : null;
  });
};

// Deletar um produto
export const deleteProduto = async (produto_id: number): Promise<void> => {
  await pool.query("UPDATE pi2_produtos SET produto_estado = 0 WHERE produto_id = $1", [
    produto_id,
  ]);
};
