if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Disposable dashboard QA only');
const pool=require('/app/dist/config/db').default,{salvarPedido,transicionar}=require('/app/dist/services/pedidos'),{registrarCredito}=require('/app/dist/services/custos-gerenciais');
(async()=>{
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome) VALUES('Distribuidora demonstração gerencial')");const fornecedor=(await pool.query('SELECT MAX(fornecedor_id) id FROM pi2_fornecedores')).rows[0].id;
 await pool.query("INSERT INTO pi2_produtos(produto_descricao,produto_estado,produto_quantidade_estoque) VALUES('Hambúrguer artesanal · demonstração',1,0)");const produto=(await pool.query('SELECT MAX(produto_id) id FROM pi2_produtos')).rows[0].id;
 require('/app/dist/services/catalogo').patchProduto(produto,{produto_precos:{compra_centavos:500,venda_centavos:1200}});
 let p=salvarPedido({fornecedor,itens:[{produto,quantidade:20,preco_centavos:500}]},1,'gerencial-demo-pedido-01');p=transicionar(p.pedido_id,'confirmar',{versao:p.pedido_versao},1,'');
 p=transicionar(p.pedido_id,'receber',{versao:p.pedido_versao,documento:'NF DEMO 001',itens:[{item:p.itens[0].item_pedido_id,quantidade:10}],custos:{frete_centavos:1000,despesas_centavos:200,desconto_centavos:100,tributos:[{codigo:'CBS',tratamento:'informativo',valor_centavos:45}],referencia_documento:'Documento sintético, Simples sem crédito'}},1,'gerencial-demo-receber01');
 p=transicionar(p.pedido_id,'devolver',{versao:p.pedido_versao,motivo:'Demonstração de avaria',itens:[{item:p.itens[0].item_pedido_id,quantidade:1}]},1,'gerencial-demo-devolver1');registrarCredito(p.pedido_id,p.entregas[0].entrega_id,{valor_centavos:500,documento:'NC DEMO 001',motivo:'Crédito comercial de demonstração'},1,'gerencial-demo-credito1');
 console.log('PASS: demonstração gerencial isolada, pedido #'+p.pedido_id);
})().catch(e=>{console.error(e);process.exitCode=1});
