import pool from '../config/db';
import { EstoqueError, quantidade, registrar } from './estoque';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const bad=(message:string):never=>{throw new EstoqueError(400,message);};
export function saldoItem(execute:Execute,item:any) {
  const old=execute(`SELECT m.*, (SELECT e.movimento_id FROM pi2_movimentos_estoque e WHERE e.movimento_estorno_de=m.movimento_id) AS estorno FROM pi2_movimentos_estoque m WHERE movimento_item_pedido_id=$1`,[item.item_pedido_id]).rows[0];
  const totals=execute(`SELECT COALESCE(SUM(CASE WHEN e.tipo='receber' THEN i.quantidade_milesimos ELSE 0 END),0) AS recebido, COALESCE(SUM(CASE WHEN e.tipo='devolver' THEN i.quantidade_milesimos ELSE 0 END),0) AS devolvido FROM pi2_entrega_itens i JOIN pi2_entregas_pedido e ON e.entrega_id=i.entrega_id WHERE i.item_pedido_id=$1`,[item.item_pedido_id]).rows[0];
  const anterior=old?Math.round(old.movimento_quantidade*1000):0;
  const recebido=totals.recebido+anterior, devolvido=totals.devolvido;
  return {recebido,devolvido,pendente:Math.max(0,Math.round(item.item_pedido_quantidade*1000)-recebido),devolvivel:Math.max(0,recebido-devolvido-(old?.estorno?anterior:0)),old};
}
export function registrarEntrega(value:number,tipo:string,body:any,user:number,key:string) {
  if(!Number.isSafeInteger(value)||value<=0) bad('Pedido inválido.');
  if(!['receber','devolver'].includes(tipo)) bad('Operação inválida.');
  if(typeof key!=='string'||!/^[\w-]{16,80}$/.test(key)) bad('Envie uma Idempotency-Key válida.');
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['versao','itens','documento','motivo'].includes(k))) bad('Campos da entrega inválidos.');
  if(!Number.isSafeInteger(body.versao)||body.versao<=0) bad('Versão inválida.');
  const documento=body.documento??'',motivo=body.motivo??'';
  if(typeof documento!=='string'||documento.length>120) bad('Documento deve ter até 120 caracteres.');
  if(typeof motivo!=='string'||motivo.length>450||(tipo==='devolver'&&motivo.trim().length<3)) bad('Informe motivo de devolução de 3 a 450 caracteres.');
  const integral=body.itens===undefined&&tipo==='receber';
  if(!integral&&(!Array.isArray(body.itens)||body.itens.length<1||body.itens.length>100)) bad('Selecione de 1 a 100 itens.');
  const seen=new Set<number>();
  const itens=integral?null:body.itens.map((i:any)=>{
    if(!i||typeof i!=='object'||Array.isArray(i)||Object.keys(i).some(k=>!['item','quantidade'].includes(k))||!Number.isSafeInteger(i.item)||i.item<=0) bad('Item inválido.');
    const q=quantidade(i.quantidade);if(q<=0||seen.has(i.item)) bad('Quantidades devem ser positivas e itens não podem repetir.');seen.add(i.item);
    return {item:i.item,quantidade:Math.round(q*1000)};
  }).sort((a:any,b:any)=>a.item-b.item);
  const conteudo=JSON.stringify({pedido:value,tipo,usuario:user,versao:body.versao,itens,documento:documento.trim(),motivo:motivo.trim()});
  return pool.transaction(execute=>{
    const actor=execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[user]).rows[0];
    if(!actor?.usuario_status||![1,2].includes(actor.usuario_perfil_id)) throw new EstoqueError(403,'Administrador ou gerente ativo necessário.');
    const old=execute('SELECT * FROM pi2_pedidos WHERE pedido_id=$1',[value]).rows[0];
    if(!old) throw new EstoqueError(404,'Pedido não encontrado.');
    const retry=execute('SELECT * FROM pi2_entregas_pedido WHERE chave=$1',[key]).rows[0];
    if(retry){if(retry.conteudo!==conteudo)throw new EstoqueError(409,'Chave já utilizada com outro conteúdo.');return retry.entrega_id;}
    // Compatibility for receipts recorded by schema 4, before the delivery ledger existed.
    if(old.pedido_recebimento_chave===key&&tipo==='receber'&&integral) return null;
    if(execute('SELECT 1 FROM pi2_pedidos WHERE pedido_recebimento_chave=$1',[key]).rows.length) throw new EstoqueError(409,'Chave já utilizada em recebimento anterior.');
    if(body.versao!==old.pedido_versao) throw new EstoqueError(409,'Pedido alterado em outra sessão. Reabra os detalhes.');
    const allowed=tipo==='receber'?['confirmado','parcial']:['parcial','recebido','encerrado'];
    if(!allowed.includes(old.pedido_fluxo)) throw new EstoqueError(409,'Operação não permitida nesta situação do pedido.');
    const rows=execute('SELECT * FROM pi2_itens_pedido WHERE item_pedido_pedido_id=$1 ORDER BY item_pedido_id',[value]).rows;
    const saldos=new Map(rows.map(i=>[i.item_pedido_id,saldoItem(execute,i)]));
    const selecionados=integral?rows.filter(i=>saldos.get(i.item_pedido_id)!.pendente>0).map(i=>({item:i.item_pedido_id,quantidade:saldos.get(i.item_pedido_id)!.pendente})):itens;
    if(!selecionados.length) throw new EstoqueError(409,'Não há quantidade pendente para receber.');
    const entrega=execute('INSERT INTO pi2_entregas_pedido (pedido_id,tipo,chave,conteudo,documento,motivo,usuario_id,data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING entrega_id',[value,tipo,key,conteudo,documento.trim(),motivo.trim(),user,new Date().toISOString()]).rows[0].entrega_id;
    for(const selected of selecionados){
      const item=rows.find(i=>i.item_pedido_id===selected.item),saldo=saldos.get(selected.item);
      if(!item||!saldo) bad('Item não pertence ao pedido.');
      if(selected.quantidade>(tipo==='receber'?saldo!.pendente:saldo!.devolvivel)) throw new EstoqueError(409,tipo==='receber'?'Quantidade excede o saldo pendente.':'Quantidade excede o recebido disponível para devolução.');
      const product=execute('SELECT * FROM pi2_produtos WHERE produto_id=$1',[item.item_pedido_produto_id]).rows[0];
      if(!product||product.produto_unidade_id!==item.item_pedido_unidade_id||(tipo==='receber'&&!product.produto_estado)) throw new EstoqueError(409,'Produto inativo ou unidade alterada. Revise o cadastro.');
      const movimento=registrar(execute,item.item_pedido_produto_id,selected.quantidade/1000,tipo==='receber'?'entrada':'saida',`${tipo==='receber'?'Recebimento':'Devolução'} do pedido #${value} · entrega #${entrega} · item #${item.item_pedido_id}`,user,`entrega-${entrega}-item-${item.item_pedido_id}-estoque`,undefined,tipo==='devolver');
      execute('INSERT INTO pi2_entrega_itens (entrega_id,item_pedido_id,quantidade_milesimos,movimento_id) VALUES ($1,$2,$3,$4)',[entrega,item.item_pedido_id,selected.quantidade,movimento.movimento_id]);
    }
    const completo=rows.every(i=>saldoItem(execute,i).pendente===0);
    const estado=tipo==='receber'?(completo?'recebido':'parcial'):old.pedido_fluxo;
    execute('UPDATE pi2_pedidos SET pedido_fluxo=$2,pedido_versao=pedido_versao+1 WHERE pedido_id=$1',[value,estado]);
    execute('INSERT INTO pi2_eventos_pedido (pedido_id,estado,data,usuario_id,observacao) VALUES ($1,$2,$3,$4,$5)',[value,estado,new Date().toISOString(),user,`${tipo==='receber'?'Recebimento':'Devolução'} #${entrega}${documento.trim()?' · documento '+documento.trim():''}${motivo.trim()?' · '+motivo.trim():''}`]);
    return entrega;
  });
}
