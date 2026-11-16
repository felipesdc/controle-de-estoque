import pool from '../config/db';
import { EstoqueError, quantidade } from './estoque-validacao';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
export function loteId(value:unknown):number|null {
  if(value===undefined||value===null)return null;
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0)throw new EstoqueError(400,'Lote inválido.');
  return value;
}
export function identidadeLote(value:any) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['codigo','validade'].includes(k))||typeof value.codigo!=='string'||!value.codigo.trim()||value.codigo.trim().length>80||/[\u0000-\u001f\u007f]/.test(value.codigo))throw new EstoqueError(400,'Informe um lote de até 80 caracteres.');
  const validade=value.validade??null;
  if(validade!==null&&(typeof validade!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(validade)||validade<'1900-01-01'||validade>'9999-12-31'||!Number.isFinite(Date.parse(validade))||new Date(validade).toISOString().slice(0,10)!==validade))throw new EstoqueError(400,'Validade do lote inválida. Use uma data real no formato AAAA-MM-DD.');
  return {codigo:value.codigo.trim(),validade};
}
export function saldoIdentificado(execute:Execute,produto:number):number {
  return execute('SELECT COALESCE(SUM(saldo_milesimos),0) AS saldo FROM pi2_lotes WHERE produto_id=$1',[produto]).rows[0].saldo;
}
export function protegerUnidade(execute:Execute,produto:number,atual:unknown,nova:unknown) {
  if((atual??null)!==(nova??null)&&saldoIdentificado(execute,produto)>0)throw new EstoqueError(409,'Não é possível alterar a unidade enquanto houver saldo identificado por lote.');
}
export function receberLote(execute:Execute,produto:any,identidade:{codigo:string;validade:string|null},usuario:number):number {
  const old=execute('SELECT * FROM pi2_lotes WHERE produto_id=$1 AND codigo=$2 COLLATE BINARY',[produto.produto_id,identidade.codigo]).rows[0];
  if(old){if(old.validade!==identidade.validade||old.unidade_id!==produto.produto_unidade_id)throw new EstoqueError(409,'Este lote já existe com outra validade ou unidade. Confira os dados.');return old.lote_id;}
  const unidade=execute('SELECT unidade_descricao FROM pi2_unidades WHERE unidade_id=$1',[produto.produto_unidade_id]).rows[0]?.unidade_descricao??null;
  return execute('INSERT INTO pi2_lotes (produto_id,codigo,validade,unidade_id,unidade,criado_em,usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING lote_id',[produto.produto_id,identidade.codigo,identidade.validade,produto.produto_unidade_id,unidade,new Date().toISOString(),usuario]).rows[0].lote_id;
}
export function aplicarLote(execute:Execute,produto:any,id:number|null,valor:number,tipo:string) {
  const total=Math.round(quantidade(produto.produto_quantidade_estoque??0)*1000),identificado=saldoIdentificado(execute,produto.produto_id);
  if(identificado>total)throw new EstoqueError(409,'Saldos por lote inconsistentes. Solicite revisão.');
  const lote=id===null?null:execute('SELECT * FROM pi2_lotes WHERE lote_id=$1',[id]).rows[0];
  if(id!==null&&(!lote||lote.produto_id!==produto.produto_id||lote.unidade_id!==produto.produto_unidade_id))throw new EstoqueError(409,'O lote não pertence a este produto ou sua unidade foi alterada.');
  const saldo=lote?lote.saldo_milesimos:total-identificado;
  const novo=saldo+(tipo==='entrada'?1:-1)*Math.round(valor*1000);
  if(novo<0)throw new EstoqueError(409,lote?'Saldo insuficiente no lote selecionado.':'Saldo sem lote insuficiente. Selecione o lote utilizado.');
  if(novo>1e12)throw new EstoqueError(409,'Saldo do lote excede o limite.');
  if(lote)execute('UPDATE pi2_lotes SET saldo_milesimos=$2 WHERE lote_id=$1',[id,novo]);
}
export function consultarLotes(id:number,query:any={}) {
  if(!Number.isSafeInteger(id)||id<=0)throw new EstoqueError(400,'Produto inválido.');
  const pagina=Number(query.pagina??1),tamanho=Number(query.tamanho??10),q=query.q??'',estado=query.estado??'todos';
  if(!Number.isSafeInteger(pagina)||pagina<1||![10,25,50].includes(tamanho)||typeof q!=='string'||q.length>80||!['todos','disponiveis'].includes(estado))throw new EstoqueError(400,'Filtros de lote inválidos.');
  return pool.transaction(execute=>{
    const produto=execute('SELECT p.*,u.unidade_descricao AS unidade FROM pi2_produtos p LEFT JOIN pi2_unidades u ON u.unidade_id=p.produto_unidade_id WHERE p.produto_id=$1',[id]).rows[0];
    if(!produto)throw new EstoqueError(404,'Produto não encontrado.');
    const identificado=saldoIdentificado(execute,id),semLote=Math.round((produto.produto_quantidade_estoque??0)*1000)-identificado;
    if(semLote<0)throw new EstoqueError(409,'Saldos por lote inconsistentes. Solicite revisão.');
    const where="produto_id=$1 AND instr(lower(codigo),lower($2))>0"+(estado==='disponiveis'?' AND saldo_milesimos>0':'');
    const total=execute('SELECT COUNT(*) AS total FROM pi2_lotes WHERE '+where,[id,q.trim()]).rows[0].total;
    const atual=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));
    const itens=execute('SELECT * FROM pi2_lotes WHERE '+where+' ORDER BY validade IS NULL,validade,codigo,lote_id LIMIT $3 OFFSET $4',[id,q.trim(),tamanho,(atual-1)*tamanho]).rows;
    return {produto_id:id,produto:produto.produto_descricao,unidade:produto.unidade,saldo:produto.produto_quantidade_estoque??0,identificado:identificado/1000,sem_lote:semLote/1000,itens,total,pagina:atual,tamanho,data_referencia:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date())};
  });
}
