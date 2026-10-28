import pool from '../config/db';
import { saldoItem, registrarEntrega } from './entregas';
import { EstoqueError, quantidade, registrar } from './estoque';
type Execute = Parameters<Parameters<typeof pool.transaction>[0]>[0];
const fail = (message:string): never => { throw new EstoqueError(400,message); };
const id = (v:unknown):number => typeof v==='number' && Number.isSafeInteger(v) && v>0 ? v : fail('Identificador inválido.');
const chave = (v:unknown):string => typeof v==='string' && /^[\w-]{16,80}$/.test(v) ? v : fail('Envie uma Idempotency-Key válida.');
function actor(execute:Execute, user:number) {
  const row=execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[user]).rows[0];
  if(!row?.usuario_status || ![1,2].includes(row.usuario_perfil_id)) throw new EstoqueError(403,'Administrador ou gerente ativo necessário.');
}
function pedido(execute:Execute, value:number) {
  const row=execute('SELECT p.*,f.fornecedor_nome AS fornecedor,u.usuario_nome AS responsavel FROM pi2_pedidos p LEFT JOIN pi2_fornecedores f ON f.fornecedor_id=p.pedido_fornecedor_id LEFT JOIN pi2_usuarios u ON u.usuario_id=p.pedido_usuario_id WHERE pedido_id=$1',[id(value)]).rows[0];
  if(!row) throw new EstoqueError(404,'Pedido não encontrado.');
  return row;
}
function detalhe(execute:Execute,value:number) {
  const row=pedido(execute,value);
  const itens=execute(`SELECT i.*,p.produto_descricao AS produto,u.unidade_descricao AS unidade,m.movimento_id,m.movimento_estornado_por FROM pi2_itens_pedido i
    LEFT JOIN pi2_produtos p ON p.produto_id=i.item_pedido_produto_id LEFT JOIN pi2_unidades u ON u.unidade_id=i.item_pedido_unidade_id
    LEFT JOIN (SELECT a.*, (SELECT e.movimento_id FROM pi2_movimentos_estoque e WHERE e.movimento_estorno_de=a.movimento_id) AS movimento_estornado_por FROM pi2_movimentos_estoque a) m ON m.movimento_item_pedido_id=i.item_pedido_id
    WHERE i.item_pedido_pedido_id=$1 ORDER BY i.item_pedido_id`,[value]).rows;
  for(const item of itens) {
    const saldo=saldoItem(execute,item);
    item.quantidade_recebida=saldo.recebido/1000;
    item.quantidade_devolvida=saldo.devolvido/1000;
    item.quantidade_pendente=saldo.pendente/1000;
    item.quantidade_devolvivel=saldo.devolvivel/1000;
    item.quantidade_encerrada=row.pedido_fluxo==='encerrado'?saldo.pendente/1000:0;
    if(!item.movimento_id) item.movimento_id=execute(`SELECT i.movimento_id FROM pi2_entrega_itens i JOIN pi2_entregas_pedido e ON e.entrega_id=i.entrega_id WHERE i.item_pedido_id=$1 AND e.tipo='receber' ORDER BY i.entrega_item_id LIMIT 1`,[item.item_pedido_id]).rows[0]?.movimento_id;
  }
  const entregas=execute('SELECT e.*,u.usuario_nome AS usuario FROM pi2_entregas_pedido e JOIN pi2_usuarios u ON u.usuario_id=e.usuario_id WHERE e.pedido_id=$1 ORDER BY e.entrega_id DESC',[value]).rows.map(({conteudo,chave,...e})=>({...e,itens:execute(`SELECT i.*,p.produto_descricao AS produto FROM pi2_entrega_itens i JOIN pi2_itens_pedido ip ON ip.item_pedido_id=i.item_pedido_id LEFT JOIN pi2_produtos p ON p.produto_id=ip.item_pedido_produto_id WHERE i.entrega_id=$1 ORDER BY i.entrega_item_id`,[e.entrega_id]).rows}));
  const eventos=execute('SELECT e.*,u.usuario_nome AS usuario FROM pi2_eventos_pedido e JOIN pi2_usuarios u ON u.usuario_id=e.usuario_id WHERE e.pedido_id=$1 ORDER BY e.evento_id',[value]).rows;
  const historico_legado=execute('SELECT h.*,e.estado_pedido_descricao AS estado FROM pi2_historico_estados_pedido h LEFT JOIN pi2_estados_pedido e ON e.estado_pedido_id=h.historico_estado_id WHERE h.historico_pedido_id=$1 ORDER BY h.historico_id',[value]).rows;
  return {...row,itens,eventos,historico_legado,entregas};
}
export const obterPedido = (value:number) => pool.transaction(execute=>detalhe(execute,value));
function evento(execute:Execute,value:number,estado:string,user:number,observacao:string) {
  execute('INSERT INTO pi2_eventos_pedido (pedido_id,estado,data,usuario_id,observacao) VALUES ($1,$2,$3,$4,$5)',[value,estado,new Date().toISOString(),user,observacao]);
}
function validar(body:any) {
  if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!['fornecedor','observacao','itens','versao'].includes(k))) fail('Campos de pedido inválidos.');
  const fornecedor=id(body.fornecedor), observacao=body.observacao??'';
  if(typeof observacao!=='string'||observacao.length>500) fail('Observação deve ter até 500 caracteres.');
  if(!Array.isArray(body.itens)||!body.itens.length||body.itens.length>100) fail('Informe de 1 a 100 itens.');
  const seen=new Set<number>();let total=0;
  const itens=body.itens.map((item:any)=>{
    if(!item||Object.keys(item).some(k=>!['produto','quantidade','preco_centavos'].includes(k))) fail('Campos de item inválidos.');
    const produto=id(item.produto), valor=quantidade(item.quantidade), preco=item.preco_centavos;
    if(valor<=0) fail('Quantidade deve ser positiva.');
    if(seen.has(produto)) fail('Agrupe cada produto em um único item.'); seen.add(produto);
    if(!Number.isSafeInteger(preco)||preco<0||preco>1e12) fail('Preço deve ser inteiro em centavos, entre zero e 1 trilhão.');
    const subtotal=Number((BigInt(Math.round(valor*1000))*BigInt(preco)+BigInt(500))/BigInt(1000));
    if(!Number.isSafeInteger(subtotal)||subtotal>1e12||(total+=subtotal)>1e12) fail('Total do pedido excede o limite de 1 trilhão de centavos.');
    return {produto,quantidade:valor,preco,total:subtotal};
  });
  return {fornecedor,observacao,itens,total};
}
function referencias(execute:Execute,data:ReturnType<typeof validar>) {
  if(!execute('SELECT 1 FROM pi2_fornecedores WHERE fornecedor_id=$1',[data.fornecedor]).rows.length) fail('Fornecedor não encontrado.');
  return data.itens.map((item:any)=>{
    const p=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[item.produto]).rows[0];
    if(!p?.produto_estado) throw new EstoqueError(409,'Todos os produtos devem existir e estar ativos.');
    return {...item,unidade:p.produto_unidade_id};
  });
}
export function salvarPedido(body:any,user:number,key:string,value?:number) {
  const data=validar(body);if(!value) chave(key);
  return pool.transaction(execute=>{
    actor(execute,user);
    if(!value) {
      const existing=execute('SELECT * FROM pi2_pedidos WHERE pedido_chave=$1',[key]).rows[0];
      if(existing) {
        const old=detalhe(execute,existing.pedido_id);
        const same=old.pedido_usuario_id===user&&old.pedido_fornecedor_id===data.fornecedor&&old.pedido_observacao===data.observacao&&JSON.stringify(old.itens.map((i:any)=>({produto:i.item_pedido_produto_id,quantidade:i.item_pedido_quantidade,preco:i.item_preco_centavos,total:i.item_total_centavos})))===JSON.stringify(data.itens);
        if(!same) throw new EstoqueError(409,'Chave já utilizada para outro conteúdo.');
        return old;
      }
    } else {
      const old=pedido(execute,value);
      if(old.pedido_fluxo!=='rascunho') throw new EstoqueError(409,'Somente rascunhos podem ser editados.');
      if(body.versao!==old.pedido_versao) throw new EstoqueError(409,'Pedido alterado em outra sessão. Reabra os detalhes.');
    }
    const itens=referencias(execute,data);
    const target=value??execute(`INSERT INTO pi2_pedidos (pedido_fornecedor_id,pedido_data,pedido_usuario_id,pedido_observacao,pedido_total,pedido_fluxo,pedido_total_centavos,pedido_chave) VALUES ($1,$2,$3,$4,$5,'rascunho',$6,$7) RETURNING pedido_id`,[data.fornecedor,new Date().toISOString(),user,data.observacao,data.total/100,data.total,key]).rows[0].pedido_id;
    if(value) {
      execute('UPDATE pi2_pedidos SET pedido_fornecedor_id=$2,pedido_observacao=$3,pedido_total_centavos=$4,pedido_total=$5,pedido_versao=pedido_versao+1 WHERE pedido_id=$1',[target,data.fornecedor,data.observacao,data.total,data.total/100]);
      execute('DELETE FROM pi2_itens_pedido WHERE item_pedido_pedido_id=$1',[target]);
    }
    for(const item of itens) execute('INSERT INTO pi2_itens_pedido (item_pedido_pedido_id,item_pedido_produto_id,item_pedido_unidade_id,item_pedido_quantidade,item_preco_centavos,item_total_centavos,item_pedido_total) VALUES ($1,$2,$3,$4,$5,$6,$7)',[target,item.produto,item.unidade,item.quantidade,item.preco,item.total,item.total/100]);
    evento(execute,target,'rascunho',user,value?'Rascunho atualizado.':'Pedido criado.');
    return detalhe(execute,target);
  });
}
export function transicionar(value:number,acao:string,body:any,user:number,key:string) {
  if(acao==='receber'||acao==='devolver') { registrarEntrega(value,acao,body,user,key); return obterPedido(value); }
  if(!['confirmar','cancelar','encerrar'].includes(acao)) fail('Ação inválida.');
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['versao','motivo'].includes(k))) fail('Campos inválidos.');
  return pool.transaction(execute=>{
    actor(execute,user);const old=pedido(execute,value);
    if(body.versao!==old.pedido_versao) throw new EstoqueError(409,'Pedido alterado em outra sessão. Reabra os detalhes.');
    const allowed=acao==='confirmar'?['rascunho']:acao==='encerrar'?['parcial']:['rascunho','confirmado'];
    if(!allowed.includes(old.pedido_fluxo)) throw new EstoqueError(409,'Transição não permitida para este pedido.');
    const motivo=acao!=='confirmar'?body.motivo:'';
    if(acao!=='confirmar'&&(typeof motivo!=='string'||motivo.trim().length<3||motivo.length>450)) fail('Informe motivo de 3 a 450 caracteres.');
    if(acao==='confirmar') {
      const itens=execute('SELECT * FROM pi2_itens_pedido WHERE item_pedido_pedido_id=$1',[value]).rows;
      if(!itens.length) throw new EstoqueError(409,'Pedido sem itens.');
      for(const item of itens) {
        const p=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[item.item_pedido_produto_id]).rows[0];
        if(!p?.produto_estado||p.produto_unidade_id!==item.item_pedido_unidade_id) throw new EstoqueError(409,'Produto inativo ou unidade alterada. Revise o cadastro e o rascunho.');
      }
    }
    const estado=acao==='confirmar'?'confirmado':acao==='encerrar'?'encerrado':'cancelado';
    execute('UPDATE pi2_pedidos SET pedido_fluxo=$2,pedido_versao=pedido_versao+1 WHERE pedido_id=$1',[value,estado]);
    evento(execute,value,estado,user,acao==='confirmar'?'Itens confirmados; aguardando recebimento.':motivo.trim());
    return detalhe(execute,value);
  });
}
export function listarPedidos(params:Record<string,unknown>) {
  const str=(k:string,def='')=>{const v=params[k]??def;if(typeof v!=='string'||v.length>200) return fail('Filtro inválido.');return v.trim();};
  const pagina=id(Number(str('pagina','1'))),tamanho=id(Number(str('tamanho','10'))),estado=str('estado'),q=str('q');
  if(![10,25,50].includes(tamanho)||!['','rascunho','confirmado','parcial','recebido','encerrado','cancelado','legado'].includes(estado)) fail('Filtro inválido.');
  const values:unknown[]=[],where:string[]=[];const bind=(v:unknown)=>{values.push(v);return `$${values.length}`;};
  if(estado) where.push(estado==='legado'?'p.pedido_fluxo IS NULL':`p.pedido_fluxo=${bind(estado)}`);
  if(q) {const search=bind(`%${q.replace(/[\\%_]/g,'\\$&')}%`);where.push(`(f.fornecedor_nome LIKE ${search} ESCAPE '\\' OR CAST(p.pedido_id AS TEXT) LIKE ${search} ESCAPE '\\' OR p.pedido_observacao LIKE ${search} ESCAPE '\\')`);}
  const from='FROM pi2_pedidos p LEFT JOIN pi2_fornecedores f ON f.fornecedor_id=p.pedido_fornecedor_id'+(where.length?' WHERE '+where.join(' AND '):'');
  return pool.transaction(execute=>{const total=execute('SELECT COUNT(*) AS total '+from,values).rows[0].total;const atual=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));const itens=execute(`SELECT p.*,f.fornecedor_nome AS fornecedor ${from} ORDER BY p.pedido_id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,tamanho,(atual-1)*tamanho]).rows;return{itens,total,pagina:atual,tamanho};});
}
