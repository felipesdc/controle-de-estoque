import pool from "../config/db";

export type MovimentacaoEstoque = {
  movimento_id: number;
  movimento_produto_id: number;
  movimento_quantidade: number;
  movimento_tipo: string;
  movimento_data: Date;
  movimento_observacao: string;
};

// Consultar todas as movimentações de estoque
export const getAllMovimentacoesEstoque = async (): Promise<
  MovimentacaoEstoque[]
> => {
  const res = await pool.query("SELECT m.*, p.produto_descricao AS movimento_produto, u.usuario_nome AS movimento_usuario, (SELECT e.movimento_id FROM pi2_movimentos_estoque e WHERE e.movimento_estorno_de = m.movimento_id) AS movimento_estornado_por FROM pi2_movimentos_estoque m LEFT JOIN pi2_produtos p ON p.produto_id = m.movimento_produto_id LEFT JOIN pi2_usuarios u ON u.usuario_id = m.movimento_usuario_id ORDER BY m.movimento_id DESC");
  return res.rows;
};

// Consultar uma movimentação de estoque específica
export const getMovimentacaoEstoqueById = async (
  movimento_id: number
): Promise<MovimentacaoEstoque> => {
  const res = await pool.query(
    "SELECT * FROM pi2_movimentos_estoque WHERE movimento_id = $1",
    [movimento_id]
  );
  return res.rows[0];
};

