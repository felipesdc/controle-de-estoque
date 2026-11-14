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
    return {...item,saldo:item.saldo_milesimos/1000,contado:item.contado_milesimos===null?null:item.contado_milesimos/1000,diferenca:item.contado_milesimos===null?null:(item.contado_milesimos-item.saldo_milesimos)/1000,saldo_atual:p.produto_quantidade_estoque??0,referencia_alterada:stale(item,p)};
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
    const itens=execute(`SELECT i.inventario_id,i.titulo,i.estado,i.versao,i.criado_em,u.usuario_nome AS criador,(SELECT COUNT(*) FROM pi2_inventario_itens t WHERE t.inventario_id=i.inventario_id) AS produtos FROM pi2_inventarios i JOIN pi2_usuarios u ON u.usuario_id=i.criado_por ${where} ORDER BY i.inventario_id DESC LIMIT 10 OFFSET $${params.length+1}`,[...params,(atual-1)*10]).rows;
    return {itens,total,pagina:atual,tamanho:10};
  });
}
export function criarInventario(body:any,user:number,requestKey:string) {
  fields(body,['titulo','produtos']);key(requestKey);
  if(typeof body.titulo!=='string'||!body.titulo.trim()||body.titulo.trim().length>120)fail(400,'Informe um título de até 120 caracteres.');
  if(!Array.isArray(body.produtos)||!body.produtos.length||body.produtos.length>100)fail(400,'Selecione de 1 a 100 produtos distintos.');
  const produtos=body.produtos.map(id).sort((a:number,b:number)=>a-b);
  if(new Set(produtos).size!==produtos.length)fail(400,'Produtos não podem repetir.');
  const content=JSON.stringify({titulo:body.titulo.trim(),produtos,usuario:user});
  return pool.transaction(execute=>{
    actor(execute,user);
    const old=execute('SELECT * FROM pi2_inventarios WHERE criacao_chave=$1',[requestKey]).rows[0];
    if(old){if(old.criacao_conteudo!==content)fail(409,'Chave utilizada em outro inventário.');return detail(execute,old.inventario_id);}
    const value=execute('INSERT INTO pi2_inventarios(titulo,criado_em,criado_por,criacao_chave,criacao_conteudo) VALUES($1,$2,$3,$4,$5) RETURNING inventario_id',[body.titulo.trim(),new Date().toISOString(),user,requestKey,content]).rows[0].inventario_id;
    for(const product of produtos){const p=current(execute,product);if(!p.produto_estado)fail(409,'Selecione somente produtos ativos.');execute('INSERT INTO pi2_inventario_itens(inventario_id,produto_id,descricao,unidade_id,unidade,saldo_milesimos,ultimo_movimento_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[value,product,p.produto_descricao,p.produto_unidade_id,p.unidade,Math.round(quantidade(p.produto_quantidade_estoque??0)*1000),p.ultimo]);}
    event(execute,value,'abertura',user,{produtos});
    return detail(execute,value);
  });
}
export function salvarContagem(value:number,body:any,user:number) {
  fields(body,['versao','itens']);
  if(!Array.isArray(body.itens)||!body.itens.length||body.itens.length>100)fail(400,'Informe de 1 a 100 contagens.');
  const seen=new Set<number>();
  const changes=body.itens.map((item:any)=>{fields(item,['produto','quantidade']);const product=id(item.produto);if(seen.has(product))fail(400,'Produto repetido.');seen.add(product);return {produto:product,contado:item.quantidade===null?null:Math.round(quantidade(item.quantidade)*1000)};});
  return pool.transaction(execute=>{
    actor(execute,user);const row=inventory(execute,value);version(row,body);
    if(row.estado!=='aberto')fail(409,'Somente inventários abertos recebem contagens.');
    const audit=[];
    for(const change of changes){const item=execute('SELECT * FROM pi2_inventario_itens WHERE inventario_id=$1 AND produto_id=$2',[value,change.produto]).rows[0];if(!item)fail(400,'Produto não pertence ao inventário.');if(item.contado_milesimos!==change.contado){execute('UPDATE pi2_inventario_itens SET contado_milesimos=$3,contado_em=$4,contado_por=$5 WHERE inventario_id=$1 AND produto_id=$2',[value,change.produto,change.contado,new Date().toISOString(),user]);audit.push({produto:change.produto,antes:item.contado_milesimos,depois:change.contado});}}
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
    if(action==='revisar'||action==='aprovar'){
      if(row.estado!==(action==='revisar'?'aberto':'revisao'))fail(409,'Situação incompatível com esta ação.');
      if(itens.some(i=>i.contado_milesimos===null))fail(409,'Conte todos os produtos antes de revisar. Zero é uma contagem válida.');
      if(itens.some(i=>stale(i,current(execute,i.produto_id))))fail(409,'Houve movimentação, alteração de unidade ou inativação desde a referência. Reative/restabeleça os produtos necessários e reinicie a contagem.');
    }
    if(action==='recontar'){
      for(const item of itens){const p=current(execute,item.produto_id);if(!p.produto_estado)fail(409,'Reative os produtos antes de reiniciar ou cancele o inventário.');execute('UPDATE pi2_inventario_itens SET descricao=$3,unidade_id=$4,unidade=$5,saldo_milesimos=$6,ultimo_movimento_id=$7,contado_milesimos=NULL,contado_em=NULL,contado_por=NULL WHERE inventario_id=$1 AND produto_id=$2',[value,item.produto_id,p.produto_descricao,p.produto_unidade_id,p.unidade,Math.round(quantidade(p.produto_quantidade_estoque??0)*1000),p.ultimo]);}
      execute("UPDATE pi2_inventarios SET estado='aberto',versao=versao+1 WHERE inventario_id=$1",[value]);
    } else if(action==='aprovar'){
      for(const item of itens){const delta=item.contado_milesimos-item.saldo_milesimos;if(delta!==0){const movement=registrar(execute,item.produto_id,Math.abs(delta)/1000,delta>0?'entrada':'saida',`Inventário #${value}: ${motivo}`,user,`inventario-${value}-produto-${item.produto_id}`);execute('UPDATE pi2_inventario_itens SET movimento_id=$3 WHERE inventario_id=$1 AND produto_id=$2',[value,item.produto_id,movement.movimento_id]);}}
      execute("UPDATE pi2_inventarios SET estado='aprovado',versao=versao+1,finalizado_em=$2,finalizado_por=$3,motivo=$4,aprovacao_chave=$5,aprovacao_conteudo=$6 WHERE inventario_id=$1",[value,new Date().toISOString(),user,motivo,requestKey,content]);
    } else if(action==='cancelar')execute("UPDATE pi2_inventarios SET estado='cancelado',versao=versao+1,finalizado_em=$2,finalizado_por=$3,motivo=$4 WHERE inventario_id=$1",[value,new Date().toISOString(),user,motivo]);
    else execute("UPDATE pi2_inventarios SET estado='revisao',versao=versao+1 WHERE inventario_id=$1",[value]);
    event(execute,value,action,user,{motivo,...(action==='recontar'?{referencia_anterior:itens}: {})});return detail(execute,value);
  });
}
