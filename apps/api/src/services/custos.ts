import pool from '../config/db';
import { EstoqueError } from './estoque-validacao';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const escala=1000000n;
export interface ContextoCusto {origem:'manual'|'compra'|'inventario'|'inicial'|'estorno';unitario_centavos?:number|null;valor_entrada_microcentavos?:string|null;}
export const dividir=(n:bigint,d:bigint)=>{if(d<=0n)throw new Error('Divisor de custo inválido');return (n+d/2n)/d;};
export function decimal(n:bigint,casas:number){const s=n.toString().padStart(casas+1,'0');return casas?s.slice(0,-casas)+'.'+s.slice(-casas):s;}
export function reais(v:string|null):string|null{return v===null?null:decimal(dividir(BigInt(v),escala),2);}
export function medio(v:string|null,q:number):string|null{return v===null||q===0?null:decimal(dividir(BigInt(v)*10n,BigInt(q)),6);}
export function custoUnitario(value:unknown):number|null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>1e12)throw new EstoqueError(400,'Custo unitário deve ser centavos inteiros entre zero e 1 trilhão.');
  return value;
}
export function ultimoCusto(execute:Execute,produto:number){return execute('SELECT * FROM pi2_custos_eventos WHERE produto_id=$1 ORDER BY evento_id DESC LIMIT 1',[produto]).rows[0];}
function gravar(execute:Execute,p:any,data:any){
  const unidade=execute('SELECT unidade_descricao FROM pi2_unidades WHERE unidade_id=$1',[p.produto_unidade_id]).rows[0]?.unidade_descricao??null;
  return execute(`INSERT INTO pi2_custos_eventos(produto_id,data,natureza,movimento_id,saldo_milesimos,valor_microcentavos,valor_movimento_microcentavos,unidade_id,unidade,usuario_id,motivo,chave,solicitacao)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[p.produto_id,data.data??new Date().toISOString(),data.natureza,data.movimento_id,data.saldo,data.valor,data.valor_movimento,p.produto_unidade_id,unidade,data.usuario,data.motivo??'',data.chave,data.solicitacao??'{}']).rows[0];
}
export function iniciarCusto(execute:Execute,p:any){
  const q=Math.round((p.produto_quantidade_estoque??0)*1000),last=ultimoCusto(execute,p.produto_id);
  if(last&&last.saldo_milesimos===q&&(last.unidade_id??null)===(p.produto_unidade_id??null))return last;
  return gravar(execute,p,{natureza:last?'referencia_alterada':'abertura',saldo:q,valor:q===0?'0':null,motivo:last?'Saldo ou unidade alterados fora da referência de custo; valor desconhecido':'Referência inicial sem custo presumido'});
}
export function reconciliarCusto(execute:Execute,produto:number){const p=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[produto]).rows[0];if(p)iniciarCusto(execute,p);}
export function solicitacaoCusto(c:ContextoCusto){return JSON.stringify({origem:c.origem,unitario_centavos:custoUnitario(c.unitario_centavos),valor_entrada_microcentavos:c.valor_entrada_microcentavos??null});}
export function baseInventario(execute:Execute,produto:number){const p=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[produto]).rows[0];return iniciarCusto(execute,p);}
export function custoInventario(base:any,quantidade:number):ContextoCusto {
  return {origem:'inventario',valor_entrada_microcentavos:base.valor_microcentavos!==null&&base.saldo_milesimos>0?dividir(BigInt(base.valor_microcentavos)*BigInt(Math.round(quantidade*1000)),BigInt(base.saldo_milesimos)).toString():null};
}
export function registrarCusto(execute:Execute,p:any,m:any,c:ContextoCusto,base:any){
  const q=BigInt(Math.round(m.movimento_quantidade*1000)),saldo=BigInt(base.saldo_milesimos),novo=Math.round(m.movimento_saldo_posterior*1000);
  let valor=base.valor_microcentavos===null?null:BigInt(base.valor_microcentavos),fluxo:bigint|null=null;
  const unitario=custoUnitario(c.unitario_centavos);
  if(c.origem==='estorno'){
    const original=execute('SELECT * FROM pi2_custos_eventos WHERE movimento_id=$1',[m.movimento_estorno_de]).rows[0];
    if(original&&original.unidade_id===p.produto_unidade_id&&original.valor_movimento_microcentavos!==null)fluxo=BigInt(original.valor_movimento_microcentavos);
  } else if(m.movimento_tipo==='saida'){
    fluxo=valor===null?null:dividir(valor*q,saldo);
  } else if(c.origem==='inventario'){
    fluxo=c.valor_entrada_microcentavos==null?null:BigInt(c.valor_entrada_microcentavos);
  } else if(unitario!==null)fluxo=BigInt(unitario)*q*1000n;
  // A known entry cannot retrospectively value an unknown opening balance.
  if(m.movimento_tipo==='entrada')valor=valor===null||fluxo===null?null:valor+fluxo;
  else valor=valor===null||fluxo===null||fluxo>valor?null:valor-fluxo;
  if(novo===0)valor=0n;
  return gravar(execute,p,{data:m.movimento_data,natureza:c.origem,movimento_id:m.movimento_id,saldo:novo,valor:valor===null?null:valor.toString(),valor_movimento:fluxo===null?null:fluxo.toString(),usuario:m.movimento_usuario_id,motivo:valor===null?'Custo desconhecido ou reversão sem base compatível':'',solicitacao:solicitacaoCusto(c)});
}
export function avaliarCusto(produto:number,body:any,usuario:number,chave:string){
  if(!Number.isSafeInteger(produto)||produto<=0||!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['evento_id','unitario_centavos','motivo'].includes(k)))throw new EstoqueError(400,'Avaliação de custo inválida.');
  const unitario=custoUnitario(body.unitario_centavos);
  if(unitario===null||!Number.isSafeInteger(body.evento_id)||body.evento_id<=0||typeof body.motivo!=='string'||body.motivo.trim().length<3||body.motivo.length>350||typeof chave!=='string'||! /^[\w-]{16,80}$/.test(chave))throw new EstoqueError(400,'Informe custo, referência atual, justificativa e chave válidos.');
  const conteudo=JSON.stringify({produto,evento_id:body.evento_id,unitario_centavos:unitario,motivo:body.motivo.trim(),usuario});
  return pool.transaction(execute=>{
    const actor=execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[usuario]).rows[0];
    if(!actor?.usuario_status||![1,2].includes(actor.usuario_perfil_id))throw new EstoqueError(403,'Avaliação restrita à gestão.');
    const retry=execute('SELECT * FROM pi2_custos_eventos WHERE chave=$1',[chave]).rows[0];
    if(retry){if(retry.solicitacao!==conteudo)throw new EstoqueError(409,'Chave utilizada em outra avaliação.');return {evento_id:retry.evento_id};}
    const p=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[produto]).rows[0];
    if(!p)throw new EstoqueError(404,'Produto não encontrado.');
    const base=iniciarCusto(execute,p);
    if(base.evento_id!==body.evento_id||base.saldo_milesimos<=0||!p.produto_estado)throw new EstoqueError(409,'Saldo, custo ou cadastro alterado. Atualize a posição antes de avaliar um produto ativo com saldo.');
    const event=gravar(execute,p,{natureza:'avaliacao',saldo:base.saldo_milesimos,valor:(BigInt(unitario)*BigInt(base.saldo_milesimos)*1000n).toString(),usuario,motivo:body.motivo.trim(),chave,solicitacao:conteudo});
    return {evento_id:event.evento_id};
  });
}
