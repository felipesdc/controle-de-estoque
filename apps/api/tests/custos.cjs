const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const pool=require('/app/dist/config/db').default;const {createProduto}=require('/app/dist/models/produto');
const {movimentar,estornar}=require('/app/dist/services/estoque');const {avaliarCusto,ultimoCusto}=require('/app/dist/services/custos');
const {relatorioCustos,evolucaoCustos,custosCsv,historicoCustos}=require('/app/dist/services/relatorios-custos');
const {salvarPedido,transicionar}=require('/app/dist/services/pedidos');const {patchProduto}=require('/app/dist/services/catalogo');
const {criarInventario,salvarContagem,acaoInventario}=require('/app/dist/services/inventarios');
const bad=(status,fn)=>assert.throws(fn,e=>e.status===status);
(async()=>{
 await pool.query("INSERT INTO pi2_unidades(unidade_id,unidade_descricao) VALUES(1,'kg'),(2,'Pacote')");
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome) VALUES('QA')");
 await pool.query("INSERT INTO pi2_usuarios(usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status,usuario_operar_estoque) VALUES('operador','op@qa.local','hash',3,1,1)");
 const criar=async(nome,initial=0,price)=>createProduto(nome,null,null,1,null,initial,null,'000123',true,1,price===undefined?undefined:{compra_centavos:price,venda_centavos:null});
 const p=await criar('=Café; teste'),id=p.produto_id;
 const last=(prod=id)=>pool.transaction(e=>ultimoCusto(e,prod));
 const linha=(prod=id)=>relatorioCustos({}).itens.find(i=>i.produto_id===prod);
 const move=(q,tipo,custo,prod=id,key=randomUUID(),user=1)=>movimentar({movimento_produto_id:prod,movimento_quantidade:q,movimento_tipo:tipo,...(custo===undefined?{}:{movimento_custo_unitario_centavos:custo})},user,key);
 const saldo=()=>last().valor_microcentavos;
 assert.equal(linha().valor_reais,'0.00');assert.equal(linha().custo_medio_reais,null);
 move(10,'entrada',100);move(10,'entrada',300);assert.equal(linha().valor_reais,'40.00');assert.equal(linha().custo_medio_reais,'2.000000');
 const out=move(5,'saida');assert.equal(linha().valor_reais,'30.00');assert.equal(linha().saldo,15);
 estornar(out.movimento_id,'Correção de quantidade',1,randomUUID());assert.equal(linha().valor_reais,'40.00');assert.equal(linha().saldo,20);
 const key=randomUUID(),entry=move(1,'entrada',0,id,key);assert.equal(move(1,'entrada',0,id,key).movimento_id,entry.movimento_id);bad(409,()=>move(1,'entrada',1,id,key));
 assert.equal(linha().valor_reais,'40.00');assert.equal(linha().saldo,21);assert.equal(linha().custo_conhecido,true,'zero cost is known');
 for(const v of [-1,.1,1e12+1,NaN,'1'])bad(400,()=>move(1,'entrada',v));bad(403,()=>move(1,'entrada',100,id,randomUUID(),2));bad(403,()=>move(1,'saida',100));
 // Unknown entry never silently uses the product's catalogue price.
 patchProduto(id,{produto_precos:{compra_centavos:999,venda_centavos:1999}});move(1,'entrada');assert.equal(linha().valor_reais,null);assert.equal(linha().custo_medio_reais,null);assert.equal(relatorioCustos({}).resumo.sem_custo,1);
 const beforeAssessment=last(),assessment={evento_id:beforeAssessment.evento_id,unitario_centavos:200,motivo:'Valor confirmado nos documentos de compra'},assessmentKey=randomUUID();
 bad(403,()=>avaliarCusto(id,assessment,2,randomUUID()));avaliarCusto(id,assessment,1,assessmentKey);assert.equal(linha().valor_reais,'44.00');assert.equal(linha().saldo,22);
 assert.equal(avaliarCusto(id,assessment,1,assessmentKey).evento_id,last().evento_id);bad(409,()=>avaliarCusto(id,{...assessment,motivo:'Outro valor'},1,assessmentKey));bad(409,()=>avaliarCusto(id,assessment,1,randomUUID()));
 // A movement can be reversed when value inversion is incompatible, but is then explicitly unknown.
 const costly=move(1,'entrada',10000);move(22,'saida');move(1,'entrada',0);estornar(costly.movimento_id,'Correção de entrada onerosa',1,randomUUID());assert.equal(linha().valor_reais,null);move(linha().saldo,'saida');assert.equal(linha().valor_reais,'0.00');move(2,'entrada',125);assert.equal(linha().valor_reais,'2.50');
 // Unit changes create a new unknown valuation reference without changing past rows.
 const oldUnit=last();patchProduto(id,{produto_unidade_id:2});assert.equal(linha().valor_reais,null);assert.equal(linha().unidade,'Pacote');assert.equal((await pool.query('SELECT unidade FROM pi2_custos_eventos WHERE evento_id=$1',[oldUnit.evento_id])).rows[0].unidade,'kg');
 // Initial quantities only use a price explicitly supplied in this creation.
 const initial=await criar('Inicial confirmado',2,150);assert.equal(linha(initial.produto_id).valor_reais,'3.00');const unknown=await criar('Inicial sem custo',3);assert.equal(linha(unknown.produto_id).valor_reais,null);
 const micro=await criar('Milésimos');move(.001,'entrada',1,micro.produto_id);assert.equal(last(micro.produto_id).valor_microcentavos,'1000');assert.equal(linha(micro.produto_id).custo_medio_reais,'0.010000');move(.001,'saida',undefined,micro.produto_id);assert.equal(last(micro.produto_id).valor_microcentavos,'0');
 const huge=await criar('Valor grande');move(1e9,'entrada',1e12,huge.produto_id);assert.equal(linha(huge.produto_id).valor_reais,'10000000000000000000.00','no floating point loss');
 // Purchases use immutable order item price. Returns use current moving average, not a refund.
 const purchase=await criar('Compra');let order=salvarPedido({fornecedor:1,itens:[{produto:purchase.produto_id,quantidade:4,preco_centavos:250}]},1,randomUUID());order=transicionar(order.pedido_id,'confirmar',{versao:order.pedido_versao},1,'');order=transicionar(order.pedido_id,'receber',{versao:order.pedido_versao,itens:[{item:order.itens[0].item_pedido_id,quantidade:2,lote:{codigo:'A'}}]},1,randomUUID());assert.equal(linha(purchase.produto_id).valor_reais,'5.00');move(2,'entrada',350,purchase.produto_id);assert.equal(linha(purchase.produto_id).custo_medio_reais,'3.000000');order=transicionar(order.pedido_id,'devolver',{versao:order.pedido_versao,motivo:'Avaria física',itens:[{item:order.itens[0].item_pedido_id,lote_id:order.itens[0].lotes_devolviveis[0].lote_id,quantidade:1}]},1,randomUUID());assert.equal(linha(purchase.produto_id).valor_reais,'9.00');
 // Inventory at net zero must not lose its known cost even if all stock is withdrawn then restored.
 let inv=criarInventario({titulo:'Redistribuição custeada',produtos:[purchase.produto_id],modo:'lotes'},1,randomUUID());inv=salvarContagem(inv.inventario_id,{versao:inv.versao,itens:inv.itens[0].lotes.map(l=>({produto:purchase.produto_id,lote_id:l.lote_id,quantidade:l.lote_id===null?0:3}))},1);inv=acaoInventario(inv.inventario_id,'revisar',{versao:inv.versao},1,'');inv=acaoInventario(inv.inventario_id,'aprovar',{versao:inv.versao,motivo:'Conferência com custo conhecido'},1,randomUUID());assert.equal(linha(purchase.produto_id).valor_reais,'9.00');
 const rowsBefore=(await pool.query('SELECT COUNT(*) AS n FROM pi2_custos_eventos')).rows[0].n,valueBefore=last(micro.produto_id);
 await pool.query("CREATE TRIGGER falha_custo BEFORE INSERT ON pi2_custos_eventos WHEN NEW.natureza='manual' BEGIN SELECT RAISE(ABORT,'falha simulada'); END");assert.throws(()=>move(1,'entrada',100,micro.produto_id));assert.equal(last(micro.produto_id).evento_id,valueBefore.evento_id);assert.equal((await pool.query('SELECT produto_quantidade_estoque AS q FROM pi2_produtos WHERE produto_id=$1',[micro.produto_id])).rows[0].q,0);assert.equal((await pool.query('SELECT COUNT(*) AS n FROM pi2_custos_eventos')).rows[0].n,rowsBefore);await pool.query('DROP TRIGGER falha_custo');
 const history=historicoCustos(id);assert.ok(history.total>10);assert.ok(history.itens.every(e=>!('solicitacao'in e)&&!('chave'in e)));assert.ok(historicoCustos(id,{pagina:'2'}).itens.length>0);
 const csv=custosCsv(relatorioCustos({},new Date(),true));assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=Café; teste"));assert.ok(csv.includes("'000123"));assert.ok(csv.includes("'10000000000000000000,00"));assert.ok(csv.includes('Desconhecido'));
 // Synthetic historical dates only in this disposable database.
 await pool.query("UPDATE pi2_custos_config SET inicio='2026-11-01T03:00:00Z'");await pool.query("UPDATE pi2_custos_eventos SET data='2026-11-03T03:00:00Z'");
 const tracked=await criar('Histórico dedicado');const trackedId=tracked.produto_id;await pool.query("UPDATE pi2_custos_eventos SET data='2026-11-01T03:00:00Z' WHERE produto_id=$1",[trackedId]);
 const h1=move(2,'entrada',100,trackedId);await pool.query("UPDATE pi2_custos_eventos SET data='2026-11-01T23:00:00Z' WHERE movimento_id=$1",[h1.movimento_id]);
 const h2=move(1,'saida',undefined,trackedId);await pool.query("UPDATE pi2_custos_eventos SET data='2026-11-03T02:59:59Z' WHERE movimento_id=$1",[h2.movimento_id]);
 const reversed=estornar(h2.movimento_id,'Estorno no dia posterior',1,randomUUID());await pool.query("UPDATE pi2_custos_eventos SET data='2026-11-03T03:00:00Z' WHERE movimento_id=$1",[reversed.movimento_id]);
 const f={q:'Histórico dedicado'},now=new Date('2026-11-17T15:00Z');assert.equal(relatorioCustos({...f,data:'2026-11-01'},now).itens[0].saldo,2);assert.equal(relatorioCustos({...f,data:'2026-11-02'},now).itens[0].saldo,1);assert.equal(relatorioCustos({...f,data:'2026-11-03'},now).itens[0].saldo,2);
 const evo=evolucaoCustos({...f,inicio:'2026-11-01',fim:'2026-11-04'},now);assert.deepEqual(evo.itens.map(i=>i.valor_conhecido_reais),['2.00','1.00','2.00','2.00']);
 for(const input of [{data:'2026-10-31'},{data:'2026-02-30'},{data:'2027-01-01'},{pagina:'0'},{tamanho:'11'},{q:[]}])bad(400,()=>relatorioCustos(input,now));bad(400,()=>evolucaoCustos({inicio:'2026-11-03',fim:'2026-11-01'},now));
 console.log('PASS: moving average, exact large/fractional values, unknown/zero cost, assessment audit/version/idempotency, stock/cost atomic rollback, order prices/returns, inventory redistribution, unit changes, CSV and historical São Paulo closures without retroactive reversals.');
})().catch(e=>{console.error(e);process.exitCode=1;});
