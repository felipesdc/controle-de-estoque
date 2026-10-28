const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3108',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3108/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3108/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json()};}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const f=(await req('/cadastros/fornecedores','POST',{nome:'Fornecedor HTTP'})).data.id;
 const product=(await req('/produto','POST',{produto_descricao:'Entrega HTTP',produto_quantidade_estoque:0})).data.produto_id;
 let p=(await req('/compras/pedidos','POST',{fornecedor:f,itens:[{produto:product,quantidade:3,preco_centavos:100}]},'entrega-http-criar01')).data;
 p=(await req(`/compras/pedidos/${p.pedido_id}/confirmar`,'POST',{versao:1})).data;
 const item=p.itens[0].item_pedido_id;
 const payload={versao:p.pedido_versao,documento:'NF-001',itens:[{item,quantidade:1.25}]};
 const concurrent=await Promise.all([1,2].map(i=>req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',payload,'entrega-http-parcial'+i)));
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);const ok=concurrent.find(r=>r.status===200),key='entrega-http-parcial'+(concurrent.indexOf(ok)+1);p=ok.data;
 assert.equal(p.pedido_fluxo,'parcial');assert.equal(p.itens[0].quantidade_pendente,1.75);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',payload,key)).status,200);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{...payload,itens:[{item,quantidade:1}]},key)).status,409);
 assert.equal((await req(`/movimentacao-estoque/${p.itens[0].movimento_id}/estorno`,'POST',{motivo:'Estorno isolado'},'entrega-http-estorno')).status,409);
 const returns={versao:p.pedido_versao,motivo:'Avaria de transporte',itens:[{item,quantidade:.25}]};
 const returned=await Promise.all([1,2].map(i=>req(`/compras/pedidos/${p.pedido_id}/devolver`,'POST',returns,'entrega-http-devolve'+i)));
 assert.deepEqual(returned.map(r=>r.status).sort(),[200,409]);p=returned.find(r=>r.status===200).data;
 assert.equal(p.itens[0].quantidade_devolvida,.25);assert.equal((await req('/produto/'+product)).data.produto_quantidade_estoque,1);
 assert.equal((await req('/movimentacao-estoque/historico')).data.total,2);
 assert.equal((await req('/compras/pedidos?estado=parcial')).data.total,1);
 await req('/usuario','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta',usuario_email:'consulta@test.local',usuario_password:'entrega-consulta-2026',usuario_perfil_id:3,usuario_status:true});
 const readonly=(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'entrega-consulta-2026'})).data.token;
 assert.equal((await req('/compras/pedidos/'+p.pedido_id,'GET',undefined,undefined,readonly)).status,200);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/devolver`,'POST',{...returns,versao:p.pedido_versao},'entrega-http-bloqueio',readonly)).status,403);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/encerrar`,'POST',{versao:p.pedido_versao,motivo:'Sem entrega futura'},undefined,readonly)).status,403);
 p=(await req(`/compras/pedidos/${p.pedido_id}/encerrar`,'POST',{versao:p.pedido_versao,motivo:'Sem entrega futura'})).data;
 assert.equal(p.pedido_fluxo,'encerrado');assert.equal((await req('/compras/pedidos?estado=encerrado')).data.total,1);
 assert.equal((await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:p.pedido_versao},'entrega-http-posfim')).status,409);
 console.log('PASS: concurrent partial receipts and returns, exact retries, payload conflicts, stock linkage, permissions, statuses and closing pending quantities.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
