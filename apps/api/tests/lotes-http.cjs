const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3120',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3120/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3120/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json(),cache:r.headers.get('cache-control')};}
 assert.equal((await req('/produto/1/lotes')).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;assert.ok(token);
 const f=(await req('/cadastros/fornecedores','POST',{nome:'Fornecedor lotes HTTP'})).data.id;
 const product=(await req('/produto','POST',{produto_descricao:'Café HTTP',produto_estado:true,produto_quantidade_estoque:2})).data.produto_id;
 let p=(await req('/compras/pedidos','POST',{fornecedor:f,itens:[{produto:product,quantidade:4,preco_centavos:100}]},randomUUID())).data;
 p=(await req(`/compras/pedidos/${p.pedido_id}/confirmar`,'POST',{versao:p.pedido_versao})).data;
 const body={versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade:4,lote:{codigo:'000ABC',validade:'2028-02-29'}}]},key=randomUUID();
 const concurrent=await Promise.all([1,2].map(()=>req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',body,key)));assert.deepEqual(concurrent.map(r=>r.status),[200,200]);
 let lots=await req(`/produto/${product}/lotes`);assert.equal(lots.status,200);assert.equal(lots.cache,'no-store');assert.equal(lots.data.saldo,6);assert.equal(lots.data.identificado,4);assert.equal(lots.data.sem_lote,2);assert.equal(lots.data.total,1);const id=lots.data.itens[0].lote_id;
 const user={usuario_nome:'funcionario',usuario_nome_completo:'Operador lotes HTTP',usuario_email:'lotes@qa.local',usuario_password:'lotes-http-worker-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:true};assert.equal((await req('/acessos/usuarios','POST',user)).status,201);
 const worker=(await req('/usuario/login','POST',{usuario_login:'funcionario',usuario_password:user.usuario_password})).data.token;
 assert.equal((await req(`/produto/${product}/lotes`,'GET',undefined,undefined,worker)).status,200);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',body,randomUUID(),worker)).status,403);
 const movimento={movimento_produto_id:product,movimento_tipo:'saida',movimento_quantidade:3,movimento_lote_id:id};
 const responses=await Promise.all([1,2].map(()=>req('/movimentacao-estoque','POST',movimento,randomUUID(),worker)));assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 assert.equal((await req(`/produto/${product}/lotes`)).data.itens[0].saldo_milesimos,1000);assert.equal((await req(`/produto/${product}/lotes`)).data.sem_lote,2);
 assert.equal((await req('/movimentacao-estoque','POST',{...movimento,movimento_lote_id:null,movimento_quantidade:2.5},randomUUID(),worker)).status,409);
 const history=(await req('/movimentacao-estoque/historico')).data.itens;assert.ok(history.some(m=>m.movimento_lote_codigo==='000ABC'&&m.movimento_lote_validade==='2028-02-29'));
 assert.equal((await req(`/produto/${product}/lotes?pagina=0`)).status,400);assert.equal((await req('/produto/999999/lotes')).status,404);
 console.log('PASS: authenticated lot consultation, cache control, same-key concurrent receipt, employee lot withdrawal, concurrent stock protection, unidentified bucket, purchase restrictions and history.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
