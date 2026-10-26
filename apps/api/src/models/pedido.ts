import pool from "../config/db";

export type Pedido = {
  pedido_id: number;
  pedido_fornecedor_id: number;
  pedido_data: Date;
  pedido_usuario_id: number;
  pedido_estado_id: number;
  pedido_observacao: string;
  pedido_total: number;
};

// Consultar todos os pedidos
export const getAllPedidos = async (): Promise<Pedido[]> => {
  const res = await pool.query("SELECT * FROM pi2_pedidos");
  return res.rows;
};

// Consultar um pedido específico
export const getPedidoById = async (pedido_id: number): Promise<Pedido> => {
  const res = await pool.query(
    "SELECT * FROM pi2_pedidos WHERE pedido_id = $1",
    [pedido_id]
  );
  return res.rows[0];
};

// Criar novo pedido
export const createPedido = async (
  pedido_fornecedor_id: number,
  pedido_data: Date,
  pedido_usuario_id: number,
  pedido_estado_id: number,
  pedido_observacao: string,
  pedido_total: number
): Promise<Pedido> => {
  const res = await pool.query(
    "INSERT INTO pi2_pedidos (pedido_fornecedor_id, pedido_data, pedido_usuario_id, pedido_estado_id, pedido_observacao, pedido_total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total,
    ]
  );
  return res.rows[0];
};

// Atualizar um pedido específico
export const updatePedido = async (
  pedido_id: number,
  pedido_fornecedor_id: number,
  pedido_data: Date,
  pedido_usuario_id: number,
  pedido_estado_id: number,
  pedido_observacao: string,
  pedido_total: number
): Promise<Pedido | null> => {
  const res = await pool.query(
    "UPDATE pi2_pedidos SET pedido_fornecedor_id = $2, pedido_data = $3, pedido_usuario_id = $4, pedido_estado_id = $5, pedido_observacao = $6, pedido_total = $7 WHERE pedido_id = $1 RETURNING *",
    [
      pedido_id,
      pedido_fornecedor_id,
      pedido_data,
      pedido_usuario_id,
      pedido_estado_id,
      pedido_observacao,
      pedido_total,
    ]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um pedido
export const deletePedido = async (pedido_id: number): Promise<void> => {
  await pool.query("DELETE FROM pi2_pedidos WHERE pedido_id = $1", [pedido_id]);
};
