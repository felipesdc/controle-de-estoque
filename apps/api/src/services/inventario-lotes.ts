import { baseInventario, custoInventario } from './custos';
import pool from '../config/db';
import { EstoqueError, quantidade, registrar } from './estoque';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const limite=2000;
export function linhasLotes(execute:Execute,inventario:number,produto?:number) {
  return execute('SELECT * FROM pi2_inventario_lotes WHERE inventario_id=$1'+(produto===undefined?'':' AND produto_id=$2')+' ORDER BY produto_id,lote_id IS NOT NULL,validade IS NULL,validade,codigo,contagem_id',[inventario,produto]).rows;
}
function saldos(execute:Execute,p:any) {
  // Zero-balance lots in a previous unit stay historical and cannot be counted in the current unit.
  const lotes=execute('SELECT * FROM pi2_lotes WHERE produto_id=$1 ORDER BY lote_id',[p.produto_id]).rows;
  if(lotes.some(l=>l.saldo_milesimos>0&&(l.unidade_id??null)!==(p.produto_unidade_id??null)))throw new EstoqueError(409,'Há saldo em lote com unidade incompatível. Revise o produto.');
  const atuais=lotes.filter(l=>(l.unidade_id??null)===(p.produto_unidade_id??null));
  const semLote=Math.round(quantidade(p.produto_quantidade_estoque??0)*1000)-atuais.reduce((sum,l)=>sum+l.saldo_milesimos,0);
  if(semLote<0)throw new EstoqueError(409,'Saldos por lote inconsistentes. Solicite revisão.');
  return [{lote_id:null as number|null,codigo:null as string|null,validade:null as string|null,saldo_milesimos:semLote},...atuais];
}
export function capturarLotes(execute:Execute,inventario:number,p:any) {
  const buckets=saldos(execute,p);
  const total=execute('SELECT COUNT(*) AS n FROM pi2_inventario_lotes WHERE inventario_id=$1',[inventario]).rows[0].n;
  if(total+buckets.length>limite)throw new EstoqueError(400,'Selecione menos produtos: cada inventário admite até 2.000 contagens de lotes, incluindo os saldos sem lote.');
  for(const l of buckets)execute('INSERT INTO pi2_inventario_lotes(inventario_id,produto_id,lote_id,codigo,validade,saldo_milesimos) VALUES($1,$2,$3,$4,$5,$6)',[inventario,p.produto_id,l.lote_id,l.codigo,l.validade,l.saldo_milesimos]);
}
export function lotesAlterados(execute:Execute,inventario:number,p:any) {
  const referencia=linhasLotes(execute,inventario,p.produto_id),atuais=saldos(execute,p);
  return referencia.length!==atuais.length||referencia.some(r=>!atuais.some(l=>l.lote_id===r.lote_id&&l.saldo_milesimos===r.saldo_milesimos&&l.codigo===r.codigo&&l.validade===r.validade));
}
export function detalharLotes(execute:Execute,inventario:number,p:any) {
  const atuais=saldos(execute,p);
  return linhasLotes(execute,inventario,p.produto_id).map(l=>({...l,saldo:l.saldo_milesimos/1000,contado:l.contado_milesimos===null?null:l.contado_milesimos/1000,diferenca:l.contado_milesimos===null?null:(l.contado_milesimos-l.saldo_milesimos)/1000,saldo_atual:(atuais.find(a=>a.lote_id===l.lote_id)?.saldo_milesimos??0)/1000}));
}
export function salvarLotes(execute:Execute,inventario:number,changes:any[],usuario:number) {
  const audit=[];
  const produtos=new Set<number>();
  for(const c of changes){
    const row=execute('SELECT * FROM pi2_inventario_lotes WHERE inventario_id=$1 AND produto_id=$2 AND lote_id IS $3',[inventario,c.produto,c.lote_id]).rows[0];
    if(!row)throw new EstoqueError(400,'Lote ou saldo sem lote não pertence a este produto do inventário. Reinicie a referência se recebeu novos lotes.');
    if(row.contado_milesimos!==c.contado){
      execute('UPDATE pi2_inventario_lotes SET contado_milesimos=$2,contado_em=$3,contado_por=$4 WHERE contagem_id=$1',[row.contagem_id,c.contado,new Date().toISOString(),usuario]);
      audit.push({produto:c.produto,lote_id:row.lote_id,codigo:row.codigo,antes:row.contado_milesimos,depois:c.contado});
    }
    produtos.add(c.produto);
  }
  for(const produto of produtos){
    const rows=linhasLotes(execute,inventario,produto);
    const sum=rows.reduce((total,l)=>total+(l.contado_milesimos??0),0);
    if(sum>1e12)throw new EstoqueError(400,'A soma contada por produto deve ser de até 1 bilhão.');
    const total=rows.some(l=>l.contado_milesimos===null)?null:sum;
    execute('UPDATE pi2_inventario_itens SET contado_milesimos=$3,contado_em=$4,contado_por=$5 WHERE inventario_id=$1 AND produto_id=$2',[inventario,produto,total,new Date().toISOString(),usuario]);
  }
  return audit;
}
export function aprovarLotes(execute:Execute,inventario:number,usuario:number,motivo:string) {
  const rows=linhasLotes(execute,inventario);
  if(!rows.length||rows.some(l=>l.contado_milesimos===null))throw new EstoqueError(409,'Conte todos os lotes e os saldos sem lote antes de aprovar.');
  // Withdraw first, then add: redistributing physical quantities cannot exceed the product limit transiently.
  const changes=rows.map(l=>({...l,delta:l.contado_milesimos-l.saldo_milesimos})).filter(l=>l.delta!==0).sort((a,b)=>a.delta-b.delta||a.contagem_id-b.contagem_id);
  const bases=new Map<number,any>();
  for(const l of changes)if(!bases.has(l.produto_id))bases.set(l.produto_id,baseInventario(execute,l.produto_id));
  const audit=[];
  for(const l of changes){
    const movement=registrar(execute,l.produto_id,Math.abs(l.delta)/1000,l.delta>0?'entrada':'saida',`Inventário #${inventario} · ${l.codigo===null?'sem lote identificado':'lote '+l.codigo}: ${motivo}`,usuario,`inventario-${inventario}-contagem-${l.contagem_id}`,undefined,false,undefined,l.lote_id,custoInventario(bases.get(l.produto_id),Math.abs(l.delta)/1000));
    execute('UPDATE pi2_inventario_lotes SET movimento_id=$2 WHERE contagem_id=$1',[l.contagem_id,movement.movimento_id]);
    audit.push({produto:l.produto_id,lote_id:l.lote_id,codigo:l.codigo,diferenca_milesimos:l.delta,movimento_id:movement.movimento_id});
  }
  return audit;
}
