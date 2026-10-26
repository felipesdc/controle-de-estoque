import pool from "../config/db";

export type HistoricoEstadoPedido = {
  historico_id: number;
  historico_pedido_id: number;
  historico_estado_id: number;
  historico_data: Date;
  historico_usuario_id: number;
  historico_observacao: string;
};

// Consultar todos os históricos de estados de pedidos
export const getAllHistoricosEstadoPedido = async (): Promise<
  HistoricoEstadoPedido[]
> => {
  const res = await pool.query("SELECT * FROM pi2_historico_estados_pedido");
  return res.rows;
};

// Consultar um histórico de estado de pedido específico
export const getHistoricoEstadoPedidoById = async (
  historico_id: number
): Promise<HistoricoEstadoPedido> => {
  const res = await pool.query(
    "SELECT * FROM pi2_historico_estados_pedido WHERE historico_id = $1",
    [historico_id]
  );
  return res.rows[0];
};

// Criar novo histórico de estado de pedido
export const createHistoricoEstadoPedido = async (
  historico_pedido_id: number,
  historico_estado_id: number,
  historico_data: Date,
  historico_usuario_id: number,
  historico_observacao: string
): Promise<HistoricoEstadoPedido> => {
  const res = await pool.query(
    "INSERT INTO pi2_historico_estados_pedido (historico_pedido_id, historico_estado_id, historico_data, historico_usuario_id, historico_observacao) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao,
    ]
  );
  return res.rows[0];
};

// Atualizar um histórico de estado de pedido específico
export const updateHistoricoEstadoPedido = async (
  historico_id: number,
  historico_pedido_id: number,
  historico_estado_id: number,
  historico_data: Date,
  historico_usuario_id: number,
  historico_observacao: string
): Promise<HistoricoEstadoPedido | null> => {
  const res = await pool.query(
    "UPDATE pi2_historico_estados_pedido SET historico_pedido_id = $2, historico_estado_id = $3, historico_data = $4, historico_usuario_id = $5, historico_observacao = $6 WHERE historico_id = $1 RETURNING *",
    [
      historico_id,
      historico_pedido_id,
      historico_estado_id,
      historico_data,
      historico_usuario_id,
      historico_observacao,
    ]
  );
  return res.rows.length ? res.rows[0] : null;
};

// Deletar um histórico de estado de pedido específico
export const deleteHistoricoEstadoPedido = async (
  historico_id: number
): Promise<void> => {
  await pool.query(
    "DELETE FROM pi2_historico_estados_pedido WHERE historico_id = $1",
    [historico_id]
  );
};
