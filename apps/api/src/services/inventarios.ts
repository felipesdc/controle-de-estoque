import { baseInventario, custoInventario } from './custos';
import { capturarLotes, detalharLotes, linhasLotes, lotesAlterados, salvarLotes, aprovarLotes } from './inventario-lotes';
import { loteId, identidadeLote, receberLote } from './lotes';
import { saldoIdentificado } from './lotes';
import pool from '../config/db';
import { EstoqueError, quantidade, registrar } from './estoque';
type Execute = Parameters<Parameters<typeof pool.transaction>[0]>[0];
const fail = (status:number,message:string):never => {throw new EstoqueError(status,message);};
const id = (v:unknown):number => typeof v==='number'&&Number.isSafeInteger(v)&&v>0?v:fail(400,'Identificador inválido.');
const key = (v:unknown):string => typeof v==='string'&&/^[\w-]{16,80}$/.test(v)?v:fail(400,'Envie uma Idempotency-Key válida.');
function fields(body:any,allowed:string[]) {
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))fail(400,'Campos do inventário inválidos.');
}
function actor(execute:Execute,user:number) {
  const row=execute('SELECT usuario_status,usuario_perfil_id FROM pi2_usuarios WHERE usuario_id=$1',[id(user)]).rows[0];
  if(!row?.usuario_status||![1,2].includes(row.usuario_perfil_id))fail(403,'Inventários são restritos a administradores e gerentes ativos.');
}
function current(execute:Execute,product:number) {
  const p=execute(`SELECT p.*,u.unidade_descricao AS unidade,(SELECT COALESCE(MAX(m.movimento_id),0) FROM pi2_movimentos_estoque m WHERE m.movimento_produto_id=p.produto_id) AS ultimo FROM pi2_produtos p LEFT JOIN pi2_unidades u ON u.unidade_id=p.produto_unidade_id WHERE p.produto_id=$1`,[product]).rows[0];
  if(!p)fail(404,'Produto não encontrado.');
  return p;
}
function inventory(execute:Execute,value:number) {
  return execute('SELECT i.*,u.usuario_nome AS criador,f.usuario_nome AS finalizador FROM pi2_inventarios i JOIN pi2_usuarios u ON u.usuario_id=i.criado_por LEFT JOIN pi2_usuarios f ON f.usuario_id=i.finalizado_por WHERE inventario_id=$1',[id(value)]).rows[0]||fail(404,'Inventário não encontrado.');
}
function lines(execute:Execute,value:number) {
  return execute('SELECT * FROM pi2_inventario_itens WHERE inventario_id=$1 ORDER BY descricao COLLATE NOCASE,produto_id',[value]).rows;
}
function stale(item:any,p:any) {
  return !p.produto_estado || (p.produto_unidade_id??null)!==(item.unidade_id??null) || Math.round(quantidade(p.produto_quantidade_estoque??0)*1000)!==item.saldo_milesimos || p.ultimo!==item.ultimo_movimento_id;
}
function detail(execute:Execute,value:number) {
  const row=inventory(execute,value);
  const {criacao_chave,criacao_conteudo,aprovacao_chave,aprovacao_conteudo,...publicRow}=row;
  const itens=lines(execute,value).map(item=>{
    const p=current(execute,item.produto_id);
    return {...item,lotes:row.modo==='lotes'?detalharLotes(execute,value,p):[],saldo_lotes:saldoIdentificado(execute,item.produto_id)/1000,saldo:item.saldo_milesimos/1000,contado:item.contado_milesimos===null?null:item.contado_milesimos/1000,diferenca:item.contado_milesimos===null?null:(item.contado_milesimos-item.saldo_milesimos)/1000,saldo_atual:p.produto_quantidade_estoque??0,referencia_alterada:stale(item,p)||(row.modo==='lotes'&&lotesAlterados(execute,value,p))};
  });
  const eventos=execute('SELECT e.*,u.usuario_nome AS usuario FROM pi2_inventario_eventos e JOIN pi2_usuarios u ON u.usuario_id=e.usuario_id WHERE inventario_id=$1 ORDER BY evento_id',[value]).rows.map(e=>({...e,conteudo:JSON.parse(e.conteudo)}));
  return {...publicRow,itens,eventos};
}
function event(execute:Execute,value:number,action:string,user:number,content:unknown) {
  execute('INSERT INTO pi2_inventario_eventos(inventario_id,acao,data,usuario_id,conteudo) VALUES($1,$2,$3,$4,$5)',[value,action,new Date().toISOString(),user,JSON.stringify(content)]);
}
function version(row:any,body:any) {if(!Number.isSafeInteger(body.versao)||body.versao!==row.versao)fail(409,'Inventário alterado em outra sessão. Reabra os detalhes antes de continuar.');}
function reason(v:unknown):string {if(typeof v!=='string'||v.trim().length<3||v.length>350)fail(400,'Informe uma justificativa de 3 a 350 caracteres.');return (v as string).trim();}
export function obterInventario(value:number){return pool.transaction(execute=>detail(execute,value));}
export function listarInventarios(input:Record<string,unknown>) {
  const pagina=input.pagina??'1',estado=input.estado??'';
  if(typeof pagina!=='string'||!/^[1-9]\d*$/.test(pagina)||!Number.isSafeInteger(Number(pagina))||typeof estado!=='string'||!['','aberto','revisao','aprovado','cancelado'].includes(estado))fail(400,'Filtros de inventário inválidos.');
  return pool.transaction(execute=>{
    const where=estado?'WHERE i.estado=$1':'';const params=estado?[estado]:[];
    const total=execute(`SELECT COUNT(*) AS n FROM pi2_inventarios i ${where}`,params).rows[0].n;
    const atual=Math.min(Number(pagina),Math.max(1,Math.ceil(total/10)));
    const itens=execute(`SELECT i.inventario_id,i.titulo,i.estado,i.versao,i.modo,i.criado_em,u.usuario_nome AS criador,(SELECT COUNT(*) FROM pi2_inventario_itens t WHERE t.inventario_id=i.inventario_id) AS produtos FROM pi2_inventarios i JOIN pi2_usuarios u ON u.usuario_id=i.criado_por ${where} ORDER BY i.inventario_id DESC LIMIT 10 OFFSET $${params.length+1}`,[...params,(atual-1)*10]).rows;
    return {itens,total,pagina:atual,tamanho:10};
  });
}
export function criarInventario(body:any,user:number,requestKey:string) {
  fields(body,['titulo','produtos','modo']);key(requestKey);
  const modo=body.modo??'produto';
  if(!['produto','lotes'].includes(modo))fail(400,'Modo de inventário inválido.');
  if(typeof body.titulo!=='string'||!body.titulo.trim()||body.titulo.trim().length>120)fail(400,'Informe um título de até 120 caracteres.');
  if(!Array.isArray(body.produtos)||!body.produtos.length||body.produtos.length>100)fail(400,'Selecione de 1 a 100 produtos distintos.');
  const produtos=body.produtos.map(id).sort((a:number,b:number)=>a-b);
  if(new Set(produtos).size!==produtos.length)fail(400,'Produtos não podem repetir.');
  const content=JSON.stringify({titulo:body.titulo.trim(),produtos,usuario:user,...(modo==='lotes'?{modo}:{})});
  return pool.transaction(execute=>{
    actor(execute,user);
    const old=execute('SELECT * FROM pi2_inventarios WHERE criacao_chave=$1',[requestKey]).rows[0];
    if(old){if(old.criacao_conteudo!==content)fail(409,'Chave utilizada em outro inventário.');return detail(execute,old.inventario_id);}
    const value=execute('INSERT INTO pi2_inventarios(titulo,criado_em,criado_por,criacao_chave,criacao_conteudo,modo) VALUES($1,$2,$3,$4,$5,$6) RETURNING inventario_id',[body.titulo.trim(),new Date().toISOString(),user,requestKey,content,modo]).rows[0].inventario_id;
    for(const product of produtos){const p=current(execute,product);if(!p.produto_estado)fail(409,'Selecione somente produtos ativos.');execute('INSERT INTO pi2_inventario_itens(inventario_id,produto_id,descricao,unidade_id,unidade,saldo_milesimos,ultimo_movimento_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[value,product,p.produto_descricao,p.produto_unidade_id,p.unidade,Math.round(quantidade(p.produto_quantidade_estoque??0)*1000),p.ultimo]);if(modo==='lotes')capturarLotes(execute,value,p);}
    event(execute,value,'abertura',user,{produtos,modo});
    return detail(execute,value);
  });
}
export function salvarContagem(value:number,body:any,user:number) {
  fields(body,['versao','itens']);
  if(!Array.isArray(body.itens)||!body.itens.length||body.itens.length>2000)fail(400,'Informe de 1 a 2.000 contagens.');
  const seen=new Set<string>();
  const changes=body.itens.map((item:any)=>{
    fields(item,['produto','quantidade','lote_id']);const product=id(item.produto),lote=loteId(item.lote_id);
    const bucket=product+':'+(lote??'sem-lote');if(seen.has(bucket))fail(400,'Contagem repetida para o mesmo produto/lote.');seen.add(bucket);
    return {produto:product,lote_id:lote,detalhado:Object.prototype.hasOwnProperty.call(item,'lote_id'),contado:item.quantidade===null?null:Math.round(quantidade(item.quantidade)*1000)};
  });
  return pool.transaction(execute=>{
    actor(execute,user);const row=inventory(execute,value);version(row,body);
    if(row.estado!=='aberto')fail(409,'Somente inventários abertos recebem contagens.');
    if(changes.some((c:{detalhado:boolean})=>c.detalhado!==(row.modo==='lotes')))fail(400,row.modo==='lotes'?'Informe lote_id em cada contagem; use null para saldo sem lote.':'Este inventário conta produtos. Abra uma nova contagem por lote.');
    if(row.modo==='produto'&&changes.length>100)fail(400,'Informe até 100 contagens por produto.');
    const audit:any[]=row.modo==='lotes'?salvarLotes(execute,value,changes,user):[];
    if(row.modo==='produto')for(const change of changes){const item=execute('SELECT * FROM pi2_inventario_itens WHERE inventario_id=$1 AND produto_id=$2',[value,change.produto]).rows[0];if(!item)fail(400,'Produto não pertence ao inventário.');if(item.contado_milesimos!==change.contado){execute('UPDATE pi2_inventario_itens SET contado_milesimos=$3,contado_em=$4,contado_por=$5 WHERE inventario_id=$1 AND produto_id=$2',[value,change.produto,change.contado,new Date().toISOString(),user]);audit.push({produto:change.produto,antes:item.contado_milesimos,depois:change.contado});}}
    execute('UPDATE pi2_inventarios SET versao=versao+1 WHERE inventario_id=$1',[value]);event(execute,value,'contagem',user,{alteracoes_milesimos:audit});return detail(execute,value);
  });
}
export function acaoInventario(value:number,action:string,body:any,user:number,requestKey:string) {
  if(!['revisar','aprovar','recontar','cancelar'].includes(action))fail(400,'Ação de inventário inválida.');
  fields(body,action==='revisar'?['versao']:['versao','motivo']);
  const motivo=action==='revisar'?'':reason(body.motivo);
  if(action==='aprovar')key(requestKey);
  const content=JSON.stringify({inventario:value,usuario:user,versao:body.versao,motivo});
  return pool.transaction(execute=>{
    actor(execute,user);const row=inventory(execute,value);
    if(action==='aprovar'){
      const retry=execute('SELECT * FROM pi2_inventarios WHERE aprovacao_chave=$1',[requestKey]).rows[0];
      if(retry){if(retry.aprovacao_conteudo!==content)fail(409,'Chave utilizada em outra aprovação.');return detail(execute,value);}
    }
    version(row,body);if(['aprovado','cancelado'].includes(row.estado))fail(409,'Inventário finalizado é imutável. Abra uma nova contagem para corrigir.');
    const itens=lines(execute,value);
    const referenciaLotes=row.modo==='lotes'?linhasLotes(execute,value):[];
    let ajustes:any[]=[];
    if(action==='revisar'||action==='aprovar'){
      if(row.estado!==(action==='revisar'?'aberto':'revisao'))fail(409,'Situação incompatível com esta ação.');
      if(itens.some(i=>i.contado_milesimos===null))fail(409,'Conte todos os produtos antes de revisar. Zero é uma contagem válida.');
      if(itens.some(i=>{const p=current(execute,i.produto_id);return stale(i,p)||(row.modo==='lotes'&&lotesAlterados(execute,value,p));}))fail(409,'Houve movimentação, alteração de unidade ou inativação desde a referência. Reative/restabeleça os produtos necessários e reinicie a contagem.');
    }
    if(action==='recontar'){
      if(row.modo==='lotes')execute('DELETE FROM pi2_inventario_lotes WHERE inventario_id=$1',[value]);
      for(const item of itens){const p=current(execute,item.produto_id);if(!p.produto_estado)fail(409,'Reative os produtos antes de reiniciar ou cancele o inventário.');execute('UPDATE pi2_inventario_itens SET descricao=$3,unidade_id=$4,unidade=$5,saldo_milesimos=$6,ultimo_movimento_id=$7,contado_milesimos=NULL,contado_em=NULL,contado_por=NULL WHERE inventario_id=$1 AND produto_id=$2',[value,item.produto_id,p.produto_descricao,p.produto_unidade_id,p.unidade,Math.round(quantidade(p.produto_quantidade_estoque??0)*1000),p.ultimo]);if(row.modo==='lotes')capturarLotes(execute,value,p);}
      execute("UPDATE pi2_inventarios SET estado='aberto',versao=versao+1 WHERE inventario_id=$1",[value]);
    } else if(action==='aprovar'){
      if(row.modo==='lotes')ajustes=aprovarLotes(execute,value,user,motivo);
      else for(const item of itens){const delta=item.contado_milesimos-item.saldo_milesimos;if(delta<0&&saldoIdentificado(execute,item.produto_id)>0)throw new EstoqueError(409,'Contagem com redução de saldo identificado por lote exige uma nova contagem no modo por lote.');if(delta!==0){const movement=registrar(execute,item.produto_id,Math.abs(delta)/1000,delta>0?'entrada':'saida',`Inventário #${value}: ${motivo}`,user,`inventario-${value}-produto-${item.produto_id}`,undefined,false,undefined,undefined,custoInventario(baseInventario(execute,item.produto_id),Math.abs(delta)/1000));execute('UPDATE pi2_inventario_itens SET movimento_id=$3 WHERE inventario_id=$1 AND produto_id=$2',[value,item.produto_id,movement.movimento_id]);}}
      execute("UPDATE pi2_inventarios SET estado='aprovado',versao=versao+1,finalizado_em=$2,finalizado_por=$3,motivo=$4,aprovacao_chave=$5,aprovacao_conteudo=$6 WHERE inventario_id=$1",[value,new Date().toISOString(),user,motivo,requestKey,content]);
    } else if(action==='cancelar')execute("UPDATE pi2_inventarios SET estado='cancelado',versao=versao+1,finalizado_em=$2,finalizado_por=$3,motivo=$4 WHERE inventario_id=$1",[value,new Date().toISOString(),user,motivo]);
    else execute("UPDATE pi2_inventarios SET estado='revisao',versao=versao+1 WHERE inventario_id=$1",[value]);
    event(execute,value,action,user,{motivo,...(action==='aprovar'&&row.modo==='lotes'?{ajustes}:{}),...(action==='recontar'?{referencia_anterior:itens,referencia_lotes_anterior:referenciaLotes}: {})});return detail(execute,value);
  });
}

// Identification alone does not change stock. Quantities are counted and approved separately.
export function registrarLoteInventario(value:number,body:any,user:number,requestKey:string) {
  fields(body,['versao','produto','lote','motivo']);key(requestKey);
  const produto=id(body.produto),lote=identidadeLote(body.lote),motivo=reason(body.motivo);
  const content=JSON.stringify({inventario:value,versao:body.versao,produto,lote,motivo,usuario:user});
  return pool.transaction(execute=>{
    actor(execute,user);const row=inventory(execute,value);
    const retry=execute('SELECT * FROM pi2_inventario_lote_registros WHERE chave=$1',[requestKey]).rows[0];
    if(retry){if(retry.conteudo!==content)fail(409,'Chave utilizada em outro registro de lote.');return detail(execute,value);}
    version(row,body);
    if(row.estado!=='aberto'||row.modo!=='lotes')fail(409,'Registre lotes somente em inventários abertos no modo por lote.');
    const item=lines(execute,value).find(i=>i.produto_id===produto);
    if(!item)fail(400,'Produto não pertence ao inventário.');
    const p=current(execute,produto);
    if(stale(item,p)||lotesAlterados(execute,value,p))fail(409,'Referência alterada. Reinicie a contagem antes de registrar um novo lote.');
    if(linhasLotes(execute,value).length>=2000)fail(400,'O inventário já atingiu o limite de 2.000 contagens.');
    if(execute('SELECT 1 FROM pi2_lotes WHERE produto_id=$1 AND codigo=$2 COLLATE BINARY',[produto,lote.codigo]).rows.length)fail(409,'Este código já está cadastrado. Utilize a contagem do lote existente ou confira sua unidade.');
    const loteRegistrado=receberLote(execute,p,lote,user);
    execute('INSERT INTO pi2_inventario_lotes(inventario_id,produto_id,lote_id,codigo,validade,saldo_milesimos) VALUES($1,$2,$3,$4,$5,0)',[value,produto,loteRegistrado,lote.codigo,lote.validade]);
    // The new bucket has not been counted; an earlier product aggregate is no longer complete.
    execute('UPDATE pi2_inventario_itens SET contado_milesimos=NULL WHERE inventario_id=$1 AND produto_id=$2',[value,produto]);
    execute('INSERT INTO pi2_inventario_lote_registros(chave,inventario_id,lote_id,conteudo) VALUES($1,$2,$3,$4)',[requestKey,value,loteRegistrado,content]);
    execute('UPDATE pi2_inventarios SET versao=versao+1 WHERE inventario_id=$1',[value]);
    event(execute,value,'registro_lote',user,{produto,lote_id:loteRegistrado,codigo:lote.codigo,validade:lote.validade,motivo});
    return detail(execute,value);
  });
}
