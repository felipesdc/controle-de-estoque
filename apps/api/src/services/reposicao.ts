import pool from '../config/db';
import { EstoqueError } from './estoque';
import { saldoItem } from './entregas';

export function listarReposicao(input: Record<string, unknown>) {
  const q = input.q ?? '';
  const pagina = input.pagina ?? '1';
  if (typeof q !== 'string' || q.length > 100 || typeof pagina !== 'string' || !/^[1-9]\d*$/.test(pagina) || !Number.isSafeInteger(Number(pagina))) throw new EstoqueError(400, 'Busca ou página inválida.');
  return pool.transaction(execute => {
    const busca = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;
    const where = `p.produto_estado=1 AND COALESCE(p.produto_quantidade_estoque,0)<p.produto_estoque_minimo AND (p.produto_descricao LIKE $1 ESCAPE '\\' OR p.produto_codigo_barras LIKE $1 ESCAPE '\\' OR CAST(p.produto_id AS TEXT)=$2)`;
    const args = [busca,q.trim()];
    const total = execute(`SELECT COUNT(*) AS n FROM pi2_produtos p WHERE ${where}`,args).rows[0].n;
    const atual = Math.min(Number(pagina),Math.max(1,Math.ceil(total/25)));
    const itens = execute(`SELECT p.produto_id,p.produto_descricao,p.produto_unidade_id,p.produto_estoque_minimo,COALESCE(p.produto_quantidade_estoque,0) AS saldo,u.unidade_descricao AS unidade FROM pi2_produtos p LEFT JOIN pi2_unidades u ON u.unidade_id=p.produto_unidade_id WHERE ${where} ORDER BY p.produto_descricao COLLATE NOCASE,p.produto_id LIMIT 25 OFFSET $3`,[...args,(atual-1)*25]).rows.map(p => {
      const pedidos = execute(`SELECT i.* FROM pi2_itens_pedido i JOIN pi2_pedidos o ON o.pedido_id=i.item_pedido_pedido_id WHERE i.item_pedido_produto_id=$1 AND o.pedido_fluxo IN ('confirmado','parcial')`,[p.produto_id]).rows;
      let pendente = 0, unidadesDiferentes = 0;
      for (const item of pedidos) {
        const quantidade = saldoItem(execute,item).pendente;
        if ((item.item_pedido_unidade_id??null)!==(p.produto_unidade_id??null)) { if(quantidade>0) unidadesDiferentes++; }
        else pendente += quantidade;
      }
      const falta = Math.max(0,Math.round(p.produto_estoque_minimo*1000)-Math.round(p.saldo*1000));
      return {...p,encomendado:pendente/1000,sugestao:Math.max(0,falta-pendente)/1000,pedidos_unidade_divergente:unidadesDiferentes};
    });
    return {itens,total,pagina:atual,tamanho:25,gerado_em:new Date().toISOString()};
  });
}
