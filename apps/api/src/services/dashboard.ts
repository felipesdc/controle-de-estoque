import pool from "../config/db";
import { periodoValidade, validadeSql as validade, dataValidaSql as dataValida } from "./datas";

export function getDashboard(now = new Date()) {
  const { hoje, ate } = periodoValidade(now);
  return pool.transaction(execute => {
    const totais = execute(`SELECT COUNT(*) AS produtos_ativos,
      COALESCE(SUM(CASE WHEN COALESCE(p.produto_quantidade_estoque, 0) < 5 THEN 1 ELSE 0 END), 0) AS estoque_baixo,
      COALESCE(SUM(CASE WHEN p.produto_quantidade_estoque > 0 AND ${dataValida} AND ${validade} >= $1 AND ${validade} <= $2 THEN 1 ELSE 0 END), 0) AS vencem_em_breve,
      COALESCE(SUM(CASE WHEN p.produto_quantidade_estoque > 0 AND ${dataValida} AND ${validade} < $1 THEN 1 ELSE 0 END), 0) AS vencidos
      FROM pi2_produtos p WHERE p.produto_estado = 1`, [hoje, ate]).rows[0];
    const baixoEstoque = execute(`SELECT p.produto_id, p.produto_descricao,
      COALESCE(p.produto_quantidade_estoque, 0) AS quantidade, u.unidade_descricao AS unidade
      FROM pi2_produtos p LEFT JOIN pi2_unidades u ON u.unidade_id = p.produto_unidade_id
      WHERE p.produto_estado = 1 AND COALESCE(p.produto_quantidade_estoque, 0) < 5
      ORDER BY quantidade ASC, p.produto_descricao ASC, p.produto_id ASC LIMIT 6`).rows;
    const vencimentos = execute(`SELECT p.produto_id, p.produto_descricao,
      p.produto_quantidade_estoque AS quantidade, ${validade} AS validade,
      CASE WHEN ${validade} < $1 THEN 'vencido' WHEN ${validade} = $1 THEN 'hoje' ELSE 'em_breve' END AS situacao
      FROM pi2_produtos p WHERE p.produto_estado = 1 AND p.produto_quantidade_estoque > 0
      AND ${dataValida} AND ${validade} <= $2
      ORDER BY validade ASC, p.produto_descricao ASC, p.produto_id ASC LIMIT 6`, [hoje, ate]).rows;
    const movimentos = execute(`SELECT m.movimento_id, m.movimento_produto_id, p.produto_descricao AS produto,
      m.movimento_tipo, m.movimento_quantidade, CASE WHEN datetime(m.movimento_data) IS NOT NULL THEN m.movimento_data ELSE NULL END AS movimento_data, m.movimento_estorno_de,
      u.usuario_nome AS responsavel
      FROM pi2_movimentos_estoque m LEFT JOIN pi2_produtos p ON p.produto_id = m.movimento_produto_id
      LEFT JOIN pi2_usuarios u ON u.usuario_id = m.movimento_usuario_id
      ORDER BY datetime(m.movimento_data) DESC, m.movimento_id DESC LIMIT 10`).rows;
    return {
      atualizado_em: now.toISOString(),
      criterios: { data_referencia: hoje, fuso: "America/Sao_Paulo", estoque_baixo_abaixo_de: 5, vencimento_dias: 30, vencimento_ate: ate },
      totais, baixo_estoque: baixoEstoque, vencimentos, movimentos_recentes: movimentos,
    };
  });
}
