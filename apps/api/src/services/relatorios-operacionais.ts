import pool from '../config/db';
import { EstoqueError } from './estoque';
import { periodoValidade } from './datas';
import { csvCell } from './relatorios';

function filtros(input:Record<string,unknown>, now:Date) {
  const hoje=periodoValidade(now).hoje;
  const start=new Date(hoje+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-29);
  const text=(key:string,fallback='')=>{const v=input[key]??fallback;if(typeof v!=='string')throw new EstoqueError(400,`Filtro ${key} inválido.`);return v.trim();};
  const inicio=text('inicio',start.toISOString().slice(0,10)),fim=text('fim',hoje),q=text('q');
  for(const date of [inicio,fim])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new EstoqueError(400,'Informe datas válidas no formato AAAA-MM-DD.');
  if(inicio>fim||q.length>100)throw new EstoqueError(400,'Confira o período e a busca de até 100 caracteres.');
  const integer=(key:string,defaultValue:string)=>{const v=text(key,defaultValue);if(!/^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v)))throw new EstoqueError(400,`Filtro ${key} inválido.`);return Number(v);};
  const pagina=integer('pagina','1'),tamanho=integer('tamanho','10');
  if(![10,25,50].includes(tamanho))throw new EstoqueError(400,'Tamanho deve ser 10, 25 ou 50.');
  return {inicio,fim,q,pagina,tamanho,search:`%${q.replace(/[\\%_]/g,'\\$&')}%`};
}
function pagina(total:number,f:ReturnType<typeof filtros>,exportar:boolean){
  if(exportar&&total>10000)throw new EstoqueError(400,'A exportação permite até 10.000 linhas. Refine os filtros.');
  const paginas=Math.max(1,Math.ceil(total/f.tamanho)),atual=Math.min(f.pagina,paginas);
  return {pagina:atual,tamanho:f.tamanho,paginas,limit:exportar?10000:f.tamanho,offset:exportar?0:(atual-1)*f.tamanho};
}
function quantidadeAgregada(text:string|null){
  if(text===null)return null;
  const inteiro=BigInt(text);
  // Bound conversion to 1 trillion units so formatting retains mill precision.
  if(inteiro>BigInt(1000000000000000))throw new EstoqueError(400,'Quantidade agregada excede a precisão disponível. Reduza o período.');
  return Number(inteiro)/1000;
}
export function relatorioConsumo(input:Record<string,unknown>,now=new Date(),exportar=false){
  const f=filtros(input,now);
  return pool.transaction(execute=>{
    const cte=`WITH validos AS (SELECT m.*,p.produto_descricao AS produto,p.produto_codigo_barras AS codigo_atual
      FROM pi2_movimentos_estoque m JOIN pi2_produtos p ON p.produto_id=m.movimento_produto_id
      WHERE m.movimento_tipo='saida' AND m.movimento_estorno_de IS NULL AND m.movimento_saldo_anterior IS NOT NULL
      AND m.movimento_item_pedido_id IS NULL
      AND NOT EXISTS(SELECT 1 FROM pi2_movimentos_estoque e WHERE e.movimento_estorno_de=m.movimento_id)
      AND NOT EXISTS(SELECT 1 FROM pi2_entrega_itens e WHERE e.movimento_id=m.movimento_id)
      AND NOT EXISTS(SELECT 1 FROM pi2_inventario_itens i WHERE i.movimento_id=m.movimento_id)
      AND NOT EXISTS(SELECT 1 FROM pi2_inventario_lotes i WHERE i.movimento_id=m.movimento_id)
      AND dia_sao_paulo(m.movimento_data)>=$1 AND dia_sao_paulo(m.movimento_data)<=$2
      AND (p.produto_descricao LIKE $3 ESCAPE '\\' OR p.produto_codigo_barras LIKE $3 ESCAPE '\\' OR m.movimento_codigo_lido LIKE $3 ESCAPE '\\' OR CAST(p.produto_id AS TEXT)=$4)),
      grupos AS (SELECT movimento_produto_id AS produto_id,produto,codigo_atual,movimento_unidade_id AS unidade_id,movimento_unidade_descricao AS unidade,movimento_unidade_registrada AS unidade_registrada,
      COUNT(*) AS operacoes,CASE WHEN movimento_unidade_registrada=1 THEN CAST(SUM(CAST(ROUND(movimento_quantidade*1000) AS INTEGER)) AS TEXT) ELSE NULL END AS milesimos,
      MAX(dia_sao_paulo(movimento_data)) AS ultimo_dia FROM validos
      GROUP BY movimento_produto_id,movimento_unidade_registrada,movimento_unidade_id,movimento_unidade_descricao)`;
    const args:unknown[]=[f.inicio,f.fim,f.search,f.q];
    const resumo=execute(cte+` SELECT (SELECT COUNT(*) FROM grupos) AS linhas,COUNT(*) AS operacoes,COUNT(DISTINCT movimento_produto_id) AS produtos,COALESCE(SUM(CASE WHEN movimento_unidade_registrada=0 THEN 1 ELSE 0 END),0) AS sem_unidade_historica FROM validos`,args).rows[0];
    const page=pagina(resumo.linhas,f,exportar);
    const itens=execute(cte+' SELECT * FROM grupos ORDER BY operacoes DESC,produto COLLATE NOCASE,produto_id,unidade_registrada,COALESCE(unidade_id,0),COALESCE(unidade,\'\') LIMIT $5 OFFSET $6',[...args,page.limit,page.offset]).rows.map(({milesimos,...row})=>({...row,unidade_registrada:!!row.unidade_registrada,quantidade:quantidadeAgregada(milesimos)}));
    return {tipo:'consumo' as const,itens,total:resumo.linhas,pagina:page.pagina,tamanho:page.tamanho,paginas:page.paginas,resumo,gerado_em:now.toISOString(),filtros:{inicio:f.inicio,fim:f.fim,q:f.q},criterios:{fuso:'America/Sao_Paulo',estornos:'excluidos_ate_consulta',unidade:'registrada_na_operacao',ordenacao:'numero_de_saidas'}};
  });
}
export function relatorioCompras(input:Record<string,unknown>,now=new Date(),exportar=false){
  const f=filtros(input,now),estado=input.estado??'pendentes';
  if(typeof estado!=='string'||!['pendentes','todos','rascunho','confirmado','parcial','recebido','encerrado','cancelado'].includes(estado))throw new EstoqueError(400,'Situação de compra inválida.');
  return pool.transaction(execute=>{
    const cte=`WITH entregas AS (SELECT i.item_pedido_id,SUM(CASE WHEN e.tipo='receber' THEN i.quantidade_milesimos ELSE 0 END) AS recebido,SUM(CASE WHEN e.tipo='devolver' THEN i.quantidade_milesimos ELSE 0 END) AS devolvido FROM pi2_entrega_itens i JOIN pi2_entregas_pedido e ON e.entrega_id=i.entrega_id GROUP BY i.item_pedido_id),
      anteriores AS (SELECT movimento_item_pedido_id AS item_id,SUM(CAST(ROUND(movimento_quantidade*1000) AS INTEGER)) AS recebido FROM pi2_movimentos_estoque WHERE movimento_item_pedido_id IS NOT NULL GROUP BY movimento_item_pedido_id),
      base AS (SELECT o.pedido_id,o.pedido_data,o.pedido_fluxo,f.fornecedor_nome AS fornecedor,i.item_pedido_id AS item_id,i.item_pedido_produto_id AS produto_id,p.produto_descricao AS produto,i.item_pedido_unidade_id AS unidade_id,u.unidade_descricao AS unidade,
      CAST(ROUND(i.item_pedido_quantidade*1000) AS INTEGER) AS pedido_milesimos,COALESCE(e.recebido,0)+COALESCE(a.recebido,0) AS recebido_milesimos,COALESCE(e.devolvido,0) AS devolvido_milesimos
      FROM pi2_itens_pedido i JOIN pi2_pedidos o ON o.pedido_id=i.item_pedido_pedido_id LEFT JOIN pi2_produtos p ON p.produto_id=i.item_pedido_produto_id LEFT JOIN pi2_unidades u ON u.unidade_id=i.item_pedido_unidade_id LEFT JOIN pi2_fornecedores f ON f.fornecedor_id=o.pedido_fornecedor_id LEFT JOIN entregas e ON e.item_pedido_id=i.item_pedido_id LEFT JOIN anteriores a ON a.item_id=i.item_pedido_id
      WHERE o.pedido_fluxo IS NOT NULL AND dia_sao_paulo(o.pedido_data)>=$1 AND dia_sao_paulo(o.pedido_data)<=$2
      AND (p.produto_descricao LIKE $3 ESCAPE '\\' OR f.fornecedor_nome LIKE $3 ESCAPE '\\' OR CAST(o.pedido_id AS TEXT)=$4 OR p.produto_codigo_barras LIKE $3 ESCAPE '\\')),
      calculado AS (SELECT *,MAX(0,pedido_milesimos-recebido_milesimos) AS falta_milesimos FROM base),
      resultado AS (SELECT *,CASE WHEN pedido_fluxo IN ('confirmado','parcial') THEN falta_milesimos ELSE 0 END AS pendente_milesimos,CASE WHEN pedido_fluxo='encerrado' THEN falta_milesimos ELSE 0 END AS encerrado_milesimos FROM calculado),
      selecionados AS (SELECT * FROM resultado ${estado==='pendentes'?'WHERE pendente_milesimos>0':estado==='todos'?'':'WHERE pedido_fluxo=$5'})`;
    const args:unknown[]=[f.inicio,f.fim,f.search,f.q];if(!['pendentes','todos'].includes(estado))args.push(estado);
    const resumo=execute(cte+' SELECT COUNT(*) AS linhas,COUNT(DISTINCT pedido_id) AS pedidos,COALESCE(SUM(CASE WHEN pendente_milesimos>0 THEN 1 ELSE 0 END),0) AS itens_pendentes,COUNT(DISTINCT CASE WHEN pendente_milesimos>0 THEN pedido_id END) AS pedidos_pendentes FROM selecionados',args).rows[0];
    const page=pagina(resumo.linhas,f,exportar);
    const itens=execute(cte+` SELECT * FROM selecionados ORDER BY pedido_id DESC,item_id ASC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,page.limit,page.offset]).rows.map(({pedido_milesimos,recebido_milesimos,devolvido_milesimos,falta_milesimos,pendente_milesimos,encerrado_milesimos,...row})=>({...row,pedida:pedido_milesimos/1000,recebida:recebido_milesimos/1000,devolvida:devolvido_milesimos/1000,pendente:pendente_milesimos/1000,encerrada:encerrado_milesimos/1000}));
    return {tipo:'compras' as const,itens,total:resumo.linhas,pagina:page.pagina,tamanho:page.tamanho,paginas:page.paginas,resumo,gerado_em:now.toISOString(),filtros:{inicio:f.inicio,fim:f.fim,q:f.q,estado},criterios:{fuso:'America/Sao_Paulo',periodo:'criacao_do_pedido',quantidades:'acumuladas_ate_consulta',legado:'excluido'}};
  });
}
const decimal=(n:number|null)=>n===null?'':n.toFixed(3).replace('.',',');
export function consumoCsv(data:ReturnType<typeof relatorioConsumo>){
  const headers=['Produto ID','Produto atual','Código atual','Unidade da operação','Unidade registrada','Saídas válidas','Quantidade','Último dia (São Paulo)','Gerado em UTC','Início','Fim','Busca','Critério de estorno'];
  return csv(headers,data.itens.map(p=>[p.produto_id,p.produto,p.codigo_atual?"'"+p.codigo_atual:'',p.unidade,p.unidade_registrada?'Sim':'Não',p.operacoes,decimal(p.quantidade),p.ultimo_dia,data.gerado_em,data.filtros.inicio,data.filtros.fim,data.filtros.q,'Exclui estornadas até a consulta']));
}
export function comprasCsv(data:ReturnType<typeof relatorioCompras>){
  const headers=['Pedido ID','Data de criação','Situação','Fornecedor','Item ID','Produto ID','Produto atual','Unidade do pedido (rótulo atual)','Pedida','Recebida','Devolvida','Pendente','Encerrada','Gerado em UTC','Início','Fim','Busca','Filtro situação'];
  return csv(headers,data.itens.map(p=>[p.pedido_id,p.pedido_data,p.pedido_fluxo,p.fornecedor,p.item_id,p.produto_id,p.produto,p.unidade,decimal(p.pedida),decimal(p.recebida),decimal(p.devolvida),decimal(p.pendente),decimal(p.encerrada),data.gerado_em,data.filtros.inicio,data.filtros.fim,data.filtros.q,data.filtros.estado]));
}
function csv(headers:string[],rows:unknown[][]){return '\uFEFF'+[headers.map(csvCell).join(';'),...rows.map(row=>row.map(csvCell).join(';'))].join('\r\n')+'\r\n';}
