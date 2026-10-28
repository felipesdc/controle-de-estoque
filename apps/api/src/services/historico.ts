import pool from '../config/db';
import { EstoqueError } from './estoque';

export function listarHistorico(params: Record<string, unknown>) {
  const text = (key: string, fallback = '') => {
    const value = params[key] ?? fallback;
    if (typeof value !== 'string' || value.length > 200) throw new EstoqueError(400, 'Filtro inválido.');
    return value.trim();
  };
  const inteiro = (value: string) => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new EstoqueError(400, 'Identificador ou página inválidos.');
    return Number(value);
  };
  const pagina = inteiro(text('pagina', '1')), tamanho = inteiro(text('tamanho', '10'));
  if (![10,25,50].includes(tamanho)) throw new EstoqueError(400, 'Tamanho deve ser 10, 25 ou 50.');
  const inicio = text('inicio'), fim = text('fim');
  for (const date of [inicio, fim]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new EstoqueError(400, 'Data inválida.');
  if (inicio && fim && inicio > fim) throw new EstoqueError(400, 'O início deve ser anterior ou igual ao fim.');
  const values: unknown[] = [], conditions: string[] = [];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  // Named timezone handles historical daylight saving; invalid legacy dates do not match periods.
  const dia = 'dia_sao_paulo(m.movimento_data)';
  if (inicio) conditions.push(`${dia} >= ${bind(inicio)}`);
  if (fim) conditions.push(`${dia} <= ${bind(fim)}`);
  const produto = text('produto'), responsavel = text('responsavel'), tipo = text('tipo'), q = text('q');
  if (produto) conditions.push(`m.movimento_produto_id=${bind(inteiro(produto))}`);
  if (responsavel === 'legado') conditions.push('m.movimento_usuario_id IS NULL');
  else if (responsavel) conditions.push(`m.movimento_usuario_id=${bind(inteiro(responsavel))}`);
  if (tipo) {
    if (!['entrada','saida'].includes(tipo)) throw new EstoqueError(400, 'Tipo inválido.');
    conditions.push(`m.movimento_tipo=${bind(tipo)}`);
  }
  if (q) {
    const search = bind(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(p.produto_descricao LIKE ${search} ESCAPE '\\' OR m.movimento_observacao LIKE ${search} ESCAPE '\\' OR CAST(m.movimento_id AS TEXT) LIKE ${search} ESCAPE '\\')`);
  }
  const from = 'FROM pi2_movimentos_estoque m LEFT JOIN pi2_produtos p ON p.produto_id=m.movimento_produto_id LEFT JOIN pi2_usuarios u ON u.usuario_id=m.movimento_usuario_id';
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  return pool.transaction(execute => {
    const total = execute(`SELECT COUNT(*) AS total ${from}${where}`,values).rows[0].total;
    const atual = Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));
    const itens = execute(`SELECT m.*, COALESCE((SELECT e.pedido_id FROM pi2_entrega_itens ei JOIN pi2_entregas_pedido e ON e.entrega_id=ei.entrega_id WHERE ei.movimento_id=m.movimento_id), (SELECT ip.item_pedido_pedido_id FROM pi2_itens_pedido ip WHERE ip.item_pedido_id=m.movimento_item_pedido_id)) AS movimento_pedido_id, p.produto_descricao AS movimento_produto, u.usuario_nome AS movimento_usuario,
      (SELECT e.movimento_id FROM pi2_movimentos_estoque e WHERE e.movimento_estorno_de=m.movimento_id) AS movimento_estornado_por
      ${from}${where} ORDER BY m.movimento_id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`, [...values,tamanho,(atual-1)*tamanho]).rows;
    return {itens,total,pagina:atual,tamanho};
  });
}
export function responsaveisHistorico() {
  return pool.transaction(execute => execute(`SELECT DISTINCT u.usuario_id AS id, u.usuario_nome AS nome FROM pi2_usuarios u JOIN pi2_movimentos_estoque m ON m.movimento_usuario_id=u.usuario_id ORDER BY u.usuario_nome COLLATE NOCASE,u.usuario_id`).rows);
}
