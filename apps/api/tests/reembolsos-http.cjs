const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3134',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3134/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3134/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:(r.headers.get('content-type')||'').includes('text/csv')?await r.text():await r.json(),headers:r.headers};}
 assert.equal((await req('/relatorios/custos')).status,401);token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const f=(await req('/fornecedor','POST',{fornecedor_nome:'Fornecedor HTTP'})).data;
 const p=(await req('/produto','POST',{produto_descricao:'Produto gerencial HTTP',produto_quantidade_estoque:0,produto_precos:{compra_centavos:100,venda_centavos:300}})).data,produto=p.produto_id;
 let pedido=(await req('/compras/pedidos','POST',{fornecedor:f.fornecedor_id,itens:[{produto,quantidade:2,preco_centavos:100}]},randomUUID())).data;
 pedido=(await req(`/compras/pedidos/${pedido.pedido_id}/confirmar`,'POST',{versao:pedido.pedido_versao},randomUUID())).data;
 pedido=(await req(`/compras/pedidos/${pedido.pedido_id}/receber`,'POST',{versao:pedido.pedido_versao,custos:{frete_centavos:100},itens:[{item:pedido.itens[0].item_pedido_id,quantidade:2}]},randomUUID())).data;
 assert.equal(pedido.entregas[0].custos.custo_reais,'3.00');
 const margem=await req(`/produto/${produto}/margem`);assert.equal(margem.status,200);assert.equal(margem.data.margem_bruta_percentual,'50.00');assert.equal(margem.headers.get('cache-control'),'no-store');
 assert.equal((await req('/preco','POST',{preco_compra:'0.29'})).status,405);
 assert.equal((await req('/catalogo/produtos/opcoes')).status,200);

 pedido=(await req(`/compras/pedidos/${pedido.pedido_id}/devolver`,'POST',{versao:pedido.pedido_versao,motivo:'Devolução QA',itens:[{item:pedido.itens[0].item_pedido_id,quantidade:1}]},randomUUID())).data;
 const entrega=pedido.entregas[0].entrega_id;
 const credito=(await req(`/compras/pedidos/${pedido.pedido_id}/devolucoes/${entrega}/creditos`,'POST',{valor_centavos:500,documento:'NC QA',motivo:'Crédito QA'},randomUUID())).data.credito_id;
 const path=`/compras/pedidos/${pedido.pedido_id}/devolucoes/${entrega}/creditos/${credito}/reembolsos`,body={valor_centavos:250,forma:'pix',recebido_em:'2026-11-21',documento:'PIX QA',motivo:'Reembolso parcial'},key=randomUUID();
 const retries=await Promise.all([1,2].map(()=>req(path,'POST',body,key)));assert.deepEqual(retries.map(r=>r.status),[201,201]);assert.equal(retries[0].data.reembolso_id,retries[1].data.reembolso_id);
 const races=await Promise.all([1,2].map(()=>req(path,'POST',{...body,valor_centavos:200},randomUUID())));assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);
 assert.equal((await req(path+'/'+retries[0].data.reembolso_id+'/estornar','POST',{motivo:'Comprovante corrigido'},randomUUID())).status,201);
 const updated=(await req(`/compras/pedidos/${pedido.pedido_id}`)).data.entregas[0].creditos[0];assert.equal(updated.reembolsado_centavos,200);assert.equal(updated.pendente_centavos,300);
 const user={usuario_nome:'funcionario',usuario_nome_completo:'Operador custos HTTP',usuario_email:'custos@qa.local',usuario_password:'custos-worker-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:true};assert.equal((await req('/acessos/usuarios','POST',user)).status,201);const worker=(await req('/usuario/login','POST',{usuario_login:'funcionario',usuario_password:user.usuario_password})).data.token;
 for(const path of [`/produto/${produto}/margem`,'/preco'])assert.equal((await req(path,'GET',undefined,undefined,worker)).status,403);
 const consulta=await req(`/compras/pedidos/${pedido.pedido_id}`,'GET',undefined,undefined,worker);assert.equal(consulta.status,200);assert.ok(!('custos' in consulta.data.entregas[0]));assert.ok(!('creditos' in consulta.data.entregas[0]));
 assert.equal((await req(`/compras/pedidos/${pedido.pedido_id}/devolucoes/1/creditos`,'POST',{},randomUUID(),worker)).status,403);
 assert.equal((await req(path,'POST',body,randomUUID(),worker)).status,403);assert.equal((await req(path+'/1/estornar','POST',{motivo:'Correção QA'},randomUUID(),worker)).status,403);
 for(const tipo of ['produtos','responsaveis']){const r=await req('/movimentacao-estoque/opcoes/'+tipo,'GET',undefined,undefined,worker);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(r.data.itens.every(i=>Object.keys(i).sort().join(',')==='id,nome'));}
 console.log('PASS: refund concurrency, atomic balance caps, exact retries, reversal history, stock employee financial isolation and no-store bounded historical selectors.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
