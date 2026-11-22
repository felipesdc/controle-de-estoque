const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),pool=require('/app/dist/config/db').default;
const {salvarPedido,transicionar,obterPedido}=require('/app/dist/services/pedidos'),{registrarCredito}=require('/app/dist/services/custos-gerenciais'),{registrarReembolso}=require('/app/dist/services/reembolsos');
const bad=(status,fn)=>assert.throws(fn,e=>e.status===status);
(async()=>{
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome) VALUES('QA reembolso')");await pool.query("INSERT INTO pi2_produtos(produto_descricao,produto_estado,produto_quantidade_estoque) VALUES('QA reembolso',1,0)");
 await pool.query("INSERT INTO pi2_usuarios(usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status) VALUES('worker','worker@qa.local','hash',3,1)");
 let p=salvarPedido({fornecedor:1,itens:[{produto:1,quantidade:2,preco_centavos:1000}]},1,randomUUID());p=transicionar(p.pedido_id,'confirmar',{versao:p.pedido_versao},1,'');p=transicionar(p.pedido_id,'receber',{versao:p.pedido_versao,custos:{frete_centavos:100}},1,randomUUID());p=transicionar(p.pedido_id,'devolver',{versao:p.pedido_versao,motivo:'Avaria confirmada',itens:[{item:p.itens[0].item_pedido_id,quantidade:1}]},1,randomUUID());
 const e=p.entregas[0].entrega_id,c=registrarCredito(p.pedido_id,e,{valor_centavos:1000,documento:'NC 1',motivo:'Avaria confirmada'},1,randomUUID()).credito_id;
 const snapshot=async()=>JSON.stringify({mov:(await pool.query('SELECT * FROM pi2_movimentos_estoque')).rows,custos:(await pool.query('SELECT * FROM pi2_custos_eventos')).rows});const before=await snapshot();
 const body={valor_centavos:400,forma:'pix',recebido_em:'2026-11-21',documento:'PIX 1',motivo:'Recebimento confirmado'},save=(b=body,k=randomUUID(),user=1)=>registrarReembolso(p.pedido_id,e,c,b,user,k);
 const key=randomUUID(),r=save(body,key);assert.deepEqual(save(body,key),r);bad(409,()=>save({...body,valor_centavos:401},key));bad(403,()=>save(body,randomUUID(),2));
 for(const b of [{valor_centavos:0},{valor_centavos:-1},{valor_centavos:.1},{forma:'cartao_invalido'},{recebido_em:'2026-02-30'},{recebido_em:'2999-01-01'},{documento:' '},{motivo:'x'},{campo:'extra'}])bad(400,()=>save({...body,...b}));
 bad(409,()=>save({...body,valor_centavos:601}));const final=save({...body,valor_centavos:600});bad(409,()=>save({...body,valor_centavos:1}));
 let credit=obterPedido(p.pedido_id).entregas[0].creditos[0];assert.equal(credit.reembolsado_centavos,1000);assert.equal(credit.pendente_centavos,0);assert.equal(credit.reembolsos.length,2);assert.ok(credit.reembolsos.every(r=>!('chave'in r)&&!('solicitacao'in r)));
 const reverseKey=randomUUID(),reverse=()=>registrarReembolso(p.pedido_id,e,c,{motivo:'Comprovante lançado incorretamente'},1,reverseKey,r.reembolso_id),estorno=reverse();assert.deepEqual(reverse(),estorno);bad(409,()=>registrarReembolso(p.pedido_id,e,c,{motivo:'Outra correção'},1,randomUUID(),r.reembolso_id));
 credit=obterPedido(p.pedido_id).entregas[0].creditos[0];assert.equal(credit.reembolsado_centavos,600);assert.equal(credit.pendente_centavos,400);assert.equal(credit.reembolsos[2].valor_centavos,-400);assert.equal(credit.reembolsos[2].estorno_de_id,r.reembolso_id);
 bad(404,()=>registrarReembolso(p.pedido_id+1,e,c,body,1,randomUUID()));save();assert.equal(obterPedido(p.pedido_id).entregas[0].creditos[0].pendente_centavos,0);assert.equal(await snapshot(),before);assert.equal((await pool.query('PRAGMA foreign_key_check')).rows.length,0);
 console.log('PASS: partial/full refunds, pending balances, exact cents, immutable reversals, role/ownership limits, idempotency, dates, privacy and no stock/cost effects.');
})().catch(e=>{console.error(e);process.exitCode=1});
