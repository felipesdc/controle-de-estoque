import pool from "../config/db";

export type ItemPedido = {
  item_pedido_id: number;
  item_pedido_pedido_id: number;
  item_pedido_produto_id: number;
  item_pedido_unidade_id: number;
  item_pedido_preco_id: number;
  item_pedido_quantidade: number;
  item_pedido_total: number;
};

// Consultar todos os itens de pedido
export const getAllItensPedido = async (): Promise<ItemPedido[]> => {
  const res = await pool.query("SELECT * FROM pi2_itens_pedido");
  return res.rows;
};

// Consultar um item de pedido específico
export const getItemPedidoById = async (
  item_pedido_id: number
): Promise<ItemPedido> => {
  const res = await pool.query(
    "SELECT * FROM pi2_itens_pedido WHERE item_pedido_id = $1",
    [item_pedido_id]
  );
  return res.rows[0];
};

// Criar novo item de pedido
export const createItemPedido = async (
  item_pedido_pedido_id: number,
  item_pedido_produto_id: number,
  item_pedido_unidade_id: number,
  item_pedido_preco_id: number,
  item_pedido_quantidade: number,
  item_pedido_total: number
): Promise<ItemPedido> => {
  const res = await pool.query(
    "INSERT INTO pi2_itens_pedido (item_pedido_pedido_id, item_pedido_produto_id, item_pedido_unidade_id, item_pedido_preco_id, item_pedido_quantidade, item_pedido_total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total,
    ]
  );
  return res.rows[0];
};

// Atualizar um item de pedido específico
export const updateItemPedido = async (
  item_pedido_id: number,
  item_pedido_pedido_id: number,
  item_pedido_produto_id: number,
  item_pedido_unidade_id: number,
  item_pedido_preco_id: number,
  item_pedido_quantidade: number,
  item_pedido_total: number
): Promise<ItemPedido | null> => {
  const res = await pool.query(
    "UPDATE pi2_itens_pedido SET item_pedido_pedido_id = $2, item_pedido_produto_id = $3, item_pedido_unidade_id = $4, item_pedido_preco_id = $5, item_pedido_quantidade = $6, item_pedido_total = $7 WHERE item_pedido_id = $1 RETURNING *",
    [
      item_pedido_id,
      item_pedido_pedido_id,
      item_pedido_produto_id,
      item_pedido_unidade_id,
      item_pedido_preco_id,
      item_pedido_quantidade,
      item_pedido_total,
    ]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um item de pedido
export const deleteItemPedido = async (
  item_pedido_id: number
): Promise<void> => {
  await pool.query("DELETE FROM pi2_itens_pedido WHERE item_pedido_id = $1", [
    item_pedido_id,
  ]);
};
