import pool from "../config/db";

export type EstadoPedido = {
  estado_pedido_id: number;
  estado_pedido_descricao: string;
};

// Consultar todos os estados de pedido
export const getAllEstadosPedido = async (): Promise<EstadoPedido[]> => {
  const res = await pool.query("SELECT * FROM pi2_estados_pedido");
  return res.rows;
};

// Consultar um estado de pedido específico
export const getEstadoPedidoById = async (
  estado_pedido_id: number
): Promise<EstadoPedido> => {
  const res = await pool.query(
    "SELECT * FROM pi2_estados_pedido WHERE estado_pedido_id = $1",
    [estado_pedido_id]
  );
  return res.rows[0];
};

// Criar novo estado de pedido
export const createEstadoPedido = async (
  estado_pedido_descricao: string
): Promise<EstadoPedido> => {
  const res = await pool.query(
    "INSERT INTO pi2_estados_pedido (estado_pedido_descricao) VALUES ($1) RETURNING *",
    [estado_pedido_descricao]
  );
  return res.rows[0];
};

// Atualizar um estado de pedido específico
export const updateEstadoPedido = async (
  estado_pedido_id: number,
  estado_pedido_descricao: string
): Promise<EstadoPedido | null> => {
  const res = await pool.query(
    "UPDATE pi2_estados_pedido SET estado_pedido_descricao = $2 WHERE estado_pedido_id = $1 RETURNING *",
    [estado_pedido_id, estado_pedido_descricao]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um estado de pedido
export const deleteEstadoPedido = async (
  estado_pedido_id: number
): Promise<void> => {
  await pool.query(
    "DELETE FROM pi2_estados_pedido WHERE estado_pedido_id = $1",
    [estado_pedido_id]
  );
};
