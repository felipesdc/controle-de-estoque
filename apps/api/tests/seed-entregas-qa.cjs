const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('QA only');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,body,key){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});assert.ok(r.ok,`${path}: ${r.status}`);return r.json();}
 token=(await req('/usuario/login',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 const products=await req('/produto'),suppliers=await req('/fornecedor');
 assert.equal((await req('/compras/pedidos')).total,0);
 let p=await req('/compras/pedidos',{fornecedor:suppliers[0].fornecedor_id,itens:products.map((p,i)=>({produto:p.produto_id,quantidade:i?2:3,preco_centavos:199}))},'seed-entrega-qa-criar01');
 p=await req(`/compras/pedidos/${p.pedido_id}/confirmar`,{versao:p.pedido_versao});assert.equal(p.pedido_fluxo,'confirmado');
 console.log('PASS: disposable purchase confirmed with two pending items for partial-delivery UI validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
