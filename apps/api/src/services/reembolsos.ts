import pool from '../config/db';
import {EstoqueError} from './estoque-validacao';
import {centavosInteiros} from './dinheiro';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const fail=(message:string):never=>{throw new EstoqueError(400,message);};
const texto=(v:unknown,nome:string,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max?v.trim():fail(`${nome} inválido.`);
function identificador(v:number){if(!Number.isSafeInteger(v)||v<=0)fail('Identificador inválido.');return v;}
export function lerReembolsos(execute:Execute,credito:number){
 const itens=execute(`SELECT r.reembolso_id,r.valor_centavos,r.forma,r.recebido_em,r.documento,r.motivo,r.usuario_id,u.usuario_nome AS usuario,r.data,r.estorno_de_id FROM pi2_reembolsos_devolucao r JOIN pi2_usuarios u ON u.usuario_id=r.usuario_id WHERE r.credito_id=$1 ORDER BY r.reembolso_id`,[credito]).rows;
 return {itens,total_centavos:itens.reduce((sum,r)=>sum+r.valor_centavos,0)};
}
// Records evidence of an already received refund. Never initiates a payment.
export function registrarReembolso(pedido:number,entrega:number,credito:number,body:unknown,user:number,key:string,estornar?:number){
 for(const id of [pedido,entrega,credito,...(estornar===undefined?[]:[estornar])])identificador(id);
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Reembolso inválido.');
 const b=body as Record<string,unknown>,allowed=estornar===undefined?['valor_centavos','forma','recebido_em','documento','motivo']:['motivo'];
 if(Object.keys(b).some(k=>!allowed.includes(k)))fail('Campos de reembolso inválidos.');
 const motivo=texto(b.motivo,'Motivo',3,450);
 let valor=0,forma='',recebido_em='',documento='';
 if(estornar===undefined){
  valor=centavosInteiros(b.valor_centavos,'Reembolso');if(!valor)fail('Informe valor positivo.');
  if(!['pix','transferencia','dinheiro','outro'].includes(String(b.forma)))fail('Forma de recebimento inválida.');forma=b.forma as string;
  recebido_em=texto(b.recebido_em,'Data de recebimento',10,10);
  const data=new Date(recebido_em+'T12:00:00Z'),hoje=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(recebido_em)||!Number.isFinite(data.getTime())||data.toISOString().slice(0,10)!==recebido_em||recebido_em>hoje)fail('Informe uma data de recebimento válida, até hoje em São Paulo.');
  documento=texto(b.documento,'Documento/comprovante',1,120);
 }
 if(typeof key!=='string'||! /^[\w-]{16,80}$/.test(key))fail('Informe uma Idempotency-Key válida.');
 const solicitacao=JSON.stringify({pedido,entrega,credito,user,estornar:estornar??null,valor,forma,recebido_em,documento,motivo});
 return pool.transaction(execute=>{
  const actor=execute('SELECT usuario_status,usuario_perfil_id FROM pi2_usuarios WHERE usuario_id=$1',[user]).rows[0];
  if(!actor?.usuario_status||![1,2].includes(actor.usuario_perfil_id))throw new EstoqueError(403,'Reembolso restrito à gestão.');
  const c=execute(`SELECT c.* FROM pi2_creditos_devolucao c JOIN pi2_entregas_pedido e ON e.entrega_id=c.entrega_id WHERE c.credito_id=$1 AND e.entrega_id=$2 AND e.pedido_id=$3 AND e.tipo='devolver'`,[credito,entrega,pedido]).rows[0];
  if(!c)throw new EstoqueError(404,'Crédito de devolução não encontrado neste pedido.');
  const retry=execute('SELECT reembolso_id,solicitacao FROM pi2_reembolsos_devolucao WHERE chave=$1',[key]).rows[0];
  if(retry){if(retry.solicitacao!==solicitacao)throw new EstoqueError(409,'Chave utilizada com outro conteúdo.');return {reembolso_id:retry.reembolso_id};}
  if(estornar!==undefined){
   const r=execute('SELECT * FROM pi2_reembolsos_devolucao WHERE reembolso_id=$1 AND credito_id=$2 AND estorno_de_id IS NULL',[estornar,credito]).rows[0];
   if(!r)throw new EstoqueError(404,'Reembolso original não encontrado neste crédito.');
   if(execute('SELECT 1 FROM pi2_reembolsos_devolucao WHERE estorno_de_id=$1',[estornar]).rows.length)throw new EstoqueError(409,'Reembolso já estornado.');
   valor=-r.valor_centavos;forma=r.forma;recebido_em=r.recebido_em;documento=r.documento;
  }else if(lerReembolsos(execute,credito).total_centavos+valor>c.valor_centavos)throw new EstoqueError(409,'Reembolso excede o saldo disponível do crédito.');
  return execute(`INSERT INTO pi2_reembolsos_devolucao(credito_id,valor_centavos,forma,recebido_em,documento,motivo,usuario_id,data,estorno_de_id,chave,solicitacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING reembolso_id`,[credito,valor,forma,recebido_em,documento,motivo,user,new Date().toISOString(),estornar??null,key,solicitacao]).rows[0];
 });
}
