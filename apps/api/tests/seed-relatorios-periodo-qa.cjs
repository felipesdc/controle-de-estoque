const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 const products=await req('/produto'),a=products.find(p=>p.produto_descricao.startsWith('Arroz integral')),cafe=products.find(p=>p.produto_descricao.startsWith('Café em grãos')),molho=products.find(p=>p.produto_descricao.startsWith('Molho de tomate'));assert.ok(a&&cafe&&molho);
 let p=await req('/compras/pedidos/1');assert.equal(p.pedido_fluxo,'confirmado','Execute após seed-reposicao-qa.cjs, uma vez.');
 const item=p.itens.find(i=>i.item_pedido_produto_id===a.produto_id);
 p=await req('/compras/pedidos/1/receber','POST',{versao:p.pedido_versao,itens:[{item:item.item_pedido_id,quantidade:1}]});
 p=await req('/compras/pedidos/1/devolver','POST',{versao:p.pedido_versao,itens:[{item:item.item_pedido_id,quantidade:.25}],motivo:'Devolução demonstrativa de embalagem avariada'});
 for(const [product,q] of [[a,.5],[a,.25],[cafe,.25]])await req('/movimentacao-estoque','POST',{movimento_produto_id:product.produto_id,movimento_quantidade:q,movimento_tipo:'saida',movimento_observacao:'Consumo demonstrativo para relatório'});
 const m=await req('/movimentacao-estoque','POST',{movimento_produto_id:molho.produto_id,movimento_quantidade:.5,movimento_tipo:'saida'});await req('/movimentacao-estoque/'+m.movimento_id+'/estorno','POST',{motivo:'Lançamento demonstrativo corrigido'});
 async function draft(){return req('/compras/pedidos','POST',{fornecedor:p.pedido_fornecedor_id,observacao:'Demonstração de situações no relatório',itens:[{produto:a.produto_id,quantidade:2,preco_centavos:100}]});}
 let closed=await draft();closed=await req('/compras/pedidos/'+closed.pedido_id+'/confirmar','POST',{versao:closed.pedido_versao});closed=await req('/compras/pedidos/'+closed.pedido_id+'/receber','POST',{versao:closed.pedido_versao,itens:[{item:closed.itens[0].item_pedido_id,quantidade:.5}]});await req('/compras/pedidos/'+closed.pedido_id+'/encerrar','POST',{versao:closed.pedido_versao,motivo:'Fornecedor não entregará o restante'});
 let cancelled=await draft();await req('/compras/pedidos/'+cancelled.pedido_id+'/cancelar','POST',{versao:cancelled.pedido_versao,motivo:'Cancelamento demonstrativo'});await draft();
 // Simulate one pre-migration movement without claiming its historical unit.
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.env.SQLITE_PATH);db.prepare("UPDATE pi2_movimentos_estoque SET movimento_unidade_registrada=0,movimento_unidade_id=NULL,movimento_unidade_descricao=NULL WHERE movimento_tipo='saida' AND movimento_observacao='Dados exclusivos de validação visual'").run();db.close();
 const r=await req('/relatorios/consumo');assert.equal(r.resumo.operacoes,4);assert.equal(r.resumo.sem_unidade_historica,1);
 const b=await req('/relatorios/compras');assert.equal(b.resumo.pedidos,1);assert.equal(b.resumo.itens_pendentes,2);
 console.log('Relatórios QA: quatro saídas válidas (uma sem unidade histórica), uma devolução fora do consumo, um pedido parcial com dois itens pendentes, um encerrado, um cancelado e um rascunho.');
})().catch(e=>{console.error(e);process.exitCode=1;});
