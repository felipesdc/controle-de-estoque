const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3107',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3107/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3107/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json()};}
 assert.equal((await req('/compras/pedidos')).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const f=(await req('/cadastros/fornecedores','POST',{nome:'Fornecedor HTTP'})).data.id;
 const product=(await req('/produto','POST',{produto_descricao:'Compra HTTP',produto_quantidade_estoque:0})).data.produto_id;
 const body={fornecedor:f,observacao:'Teste HTTP',itens:[{produto:product,quantidade:2.5,preco_centavos:150}]};
 const create=await req('/compras/pedidos','POST',body,'compras-http-criar-01');assert.equal(create.status,201,JSON.stringify(create));let p=create.data;
 assert.equal(p.pedido_total_centavos,375);
 assert.equal((await req('/compras/pedidos/'+p.pedido_id,'PATCH',{...body,versao:99})).status,409);
 p=(await req(`/compras/pedidos/${p.pedido_id}/confirmar`,'POST',{versao:p.pedido_versao})).data;
 const receipts=await Promise.all([1,2].map(i=>req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:p.pedido_versao},'compras-http-receber-'+i)));
 assert.deepEqual(receipts.map(r=>r.status).sort(),[200,409]);
 const successful=receipts.find(r=>r.status===200);const successfulKey='compras-http-receber-'+(receipts.indexOf(successful)+1);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:p.pedido_versao},successfulKey)).status,200);
 assert.equal((await req('/produto/'+product)).data.produto_quantidade_estoque,2.5);
 assert.equal((await req('/movimentacao-estoque/historico')).data.total,1);
 assert.equal((await req('/compras/pedidos?estado=recebido')).data.total,1);
 assert.ok(Array.isArray((await req('/pedido')).data));
 for(const path of ['pedido','item-pedido','estado-pedido','historico-estado-pedido'])for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await req('/'+path+(method==='POST'?'':'/1'),method,{})).status,405,path+' '+method);
 await req('/usuario','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta',usuario_email:'consulta@test.local',usuario_password:'pedidos-consulta-2026',usuario_perfil_id:3,usuario_status:true});
 const readonly=(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'pedidos-consulta-2026'})).data.token;
 assert.equal((await req('/compras/pedidos','GET',undefined,undefined,readonly)).status,200);
 assert.equal((await req('/compras/pedidos/'+p.pedido_id,'GET',undefined,undefined,readonly)).status,200);
 assert.equal((await req('/compras/pedidos','POST',body,'compras-bloqueada-001',readonly)).status,403);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:3},'compras-bloqueada-002',readonly)).status,403);
 await req('/usuario','POST',{usuario_nome:'gerente',usuario_nome_completo:'Gerente',usuario_email:'gerente@test.local',usuario_password:'pedidos-gerente-2026',usuario_perfil_id:2,usuario_status:true});
 const manager=(await req('/usuario/login','POST',{usuario_login:'gerente',usuario_password:'pedidos-gerente-2026'})).data.token;
 const managed=await req('/compras/pedidos','POST',body,'compras-gerente-0001',manager);assert.equal(managed.status,201);
 const confirmed=await req(`/compras/pedidos/${managed.data.pedido_id}/confirmar`,'POST',{versao:1},undefined,manager);assert.equal(confirmed.status,200);
 const cancelled=await req(`/compras/pedidos/${managed.data.pedido_id}/cancelar`,'POST',{versao:confirmed.data.pedido_versao,motivo:'Compra suspensa'},undefined,manager);assert.equal(cancelled.status,200);assert.equal(cancelled.data.pedido_fluxo,'cancelado');
 console.log('PASS: purchase HTTP workflow, authenticated actors, consultation permissions, concurrent receipt exactly once, retry, stock linkage and legacy write protection.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
