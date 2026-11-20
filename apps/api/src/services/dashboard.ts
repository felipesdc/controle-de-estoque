import pool from "../config/db";
import { periodoValidade } from "./datas";
import { indicadoresLotes } from "./alertas-lotes";

export function getDashboard(now = new Date()) {
  const { hoje, ate } = periodoValidade(now);
  return pool.transaction(execute => {
    const contagens = execute(`SELECT COUNT(*) AS produtos_ativos,
      COALESCE(SUM(CASE WHEN COALESCE(p.produto_quantidade_estoque,0)<p.produto_estoque_minimo THEN 1 ELSE 0 END),0) AS estoque_baixo FROM pi2_produtos p WHERE p.produto_estado=1`).rows[0];
    const alertas=indicadoresLotes(execute,hoje,ate);
    const totais={...contagens,...alertas.totais};
    const baixoEstoque = execute(`SELECT p.produto_id, p.produto_descricao,
      COALESCE(p.produto_quantidade_estoque, 0) AS quantidade, p.produto_estoque_minimo, u.unidade_descricao AS unidade
      FROM pi2_produtos p LEFT JOIN pi2_unidades u ON u.unidade_id = p.produto_unidade_id
      WHERE p.produto_estado = 1 AND COALESCE(p.produto_quantidade_estoque, 0) < p.produto_estoque_minimo
      ORDER BY quantidade ASC, p.produto_descricao ASC, p.produto_id ASC LIMIT 6`).rows;
    const movimentos = execute(`SELECT m.movimento_id, m.movimento_produto_id, p.produto_descricao AS produto,
      m.movimento_tipo, m.movimento_quantidade, CASE WHEN datetime(m.movimento_data) IS NOT NULL THEN m.movimento_data ELSE NULL END AS movimento_data, m.movimento_estorno_de,
      u.usuario_nome AS responsavel
      FROM pi2_movimentos_estoque m LEFT JOIN pi2_produtos p ON p.produto_id = m.movimento_produto_id
      LEFT JOIN pi2_usuarios u ON u.usuario_id = m.movimento_usuario_id
      ORDER BY datetime(m.movimento_data) DESC, m.movimento_id DESC LIMIT 10`).rows;
    return {
      atualizado_em: now.toISOString(),
      criterios: { data_referencia: hoje, fuso: "America/Sao_Paulo", estoque_baixo_criterio: "saldo_menor_que_minimo", vencimento_dias: 30, vencimento_ate: ate, origem_validade: "lote", indicadores_validade: "produtos_distintos_por_situacao" },
      totais, baixo_estoque: baixoEstoque, vencimentos:alertas.vencimentos, pendencias_validade:alertas.pendencias, movimentos_recentes: movimentos,
    };
  });
}
