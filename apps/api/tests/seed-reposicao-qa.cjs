const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
 token=(await req('/usuario/login',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 assert.equal((await req('/compras/pedidos')).total,0,'Execute uma única vez após o mock de estoque mínimo.');
 const fornecedor=await req('/cadastros/fornecedores',{nome:'Distribuidora Demonstração'});
 const produtos=await req('/produto');
 const arroz=produtos.find(p=>p.produto_descricao.startsWith('Arroz integral'));
 const cafe=produtos.find(p=>p.produto_descricao.startsWith('Café em grãos'));
 assert.ok(arroz&&cafe);
 const r=await fetch(base+'/compras/pedidos',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'Idempotency-Key':require('node:crypto').randomUUID()},body:JSON.stringify({fornecedor:fornecedor.id,observacao:'Compra fictícia para demonstrar a reposição.',itens:[{produto:arroz.produto_id,quantidade:3,preco_centavos:2200},{produto:cafe.produto_id,quantidade:1.25,preco_centavos:4500}]})});
 assert.equal(r.status,201);const p=await r.json();
 await req('/compras/pedidos/'+p.pedido_id+'/confirmar',{versao:p.pedido_versao});
 const lista=await req('/compras/reposicao');
 assert.equal(lista.itens.find(p=>p.produto_id===arroz.produto_id).sugestao,3);
 assert.equal(lista.itens.find(p=>p.produto_id===cafe.produto_id).sugestao,0);
 console.log('Reposição demonstrativa: arroz com cobertura parcial; café coberto pela compra confirmada; papel sem compra pendente.');
})().catch(e=>{console.error(e);process.exitCode=1;});
