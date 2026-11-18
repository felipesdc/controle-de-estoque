const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3121',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3121/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3121/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json(),cache:r.headers.get('cache-control')};}
 assert.equal((await req('/inventarios')).status,401);token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const f=(await req('/cadastros/fornecedores','POST',{nome:'Inventário lotes HTTP'})).data.id;
 const product=(await req('/produto','POST',{produto_descricao:'Café lote HTTP',produto_estado:true,produto_quantidade_estoque:4})).data.produto_id;
 let p=(await req('/compras/pedidos','POST',{fornecedor:f,itens:[{produto:product,quantidade:5,preco_centavos:100}]},randomUUID())).data;p=(await req(`/compras/pedidos/${p.pedido_id}/confirmar`,'POST',{versao:p.pedido_versao})).data;
 p=(await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade:5,lote:{codigo:'000FISICO',validade:'2028-02-29'}}]},randomUUID())).data;
 const lote=(await req(`/produto/${product}/lotes`)).data.itens[0].lote_id;
 const creation={titulo:'Contagem detalhada HTTP',produtos:[product],modo:'lotes'},creationKey=randomUUID();let r=await req('/inventarios','POST',creation,creationKey);assert.equal(r.status,201);assert.equal(r.cache,'no-store');let d=r.data;const path='/inventarios/'+d.inventario_id;
 assert.equal(d.modo,'lotes');assert.equal(d.itens[0].lotes.length,2);assert.equal((await req('/inventarios','POST',creation,creationKey)).data.inventario_id,d.inventario_id);
 assert.equal((await req('/inventarios','POST',{...creation,modo:'produto'},creationKey)).status,409);
 assert.equal((await req(path,'PATCH',{versao:d.versao,itens:[{produto:product,quantidade:9}]})).status,400);
 const contagem={versao:d.versao,itens:[{produto:product,lote_id:null,quantidade:3},{produto:product,lote_id:lote,quantidade:4.875}]};
 const saves=await Promise.all([1,2].map(()=>req(path,'PATCH',contagem)));assert.deepEqual(saves.map(r=>r.status).sort(),[200,409]);d=saves.find(r=>r.status===200).data;assert.equal(d.itens[0].contado,7.875);
 d=(await req(path+'/revisar','POST',{versao:d.versao})).data;
 const approval={versao:d.versao,motivo:'Conferência concluída'},key=randomUUID();const approved=await Promise.all([1,2].map(()=>req(path+'/aprovar','POST',approval,key)));assert.deepEqual(approved.map(r=>r.status),[200,200]);d=approved[0].data;
 const balances=(await req(`/produto/${product}/lotes`)).data;assert.equal(balances.saldo,7.875);assert.equal(balances.sem_lote,3);assert.equal(balances.itens[0].saldo_milesimos,4875);
 assert.equal((await req('/relatorios/consumo')).data.resumo.operacoes,0);
 const movement=d.itens[0].lotes.find(l=>l.lote_id===lote).movimento_id;
 assert.equal((await req('/movimentacao-estoque/'+movement+'/estorno','POST',{motivo:'Não permitido'},randomUUID())).status,409);
 const history=(await req('/movimentacao-estoque/historico')).data.itens;assert.equal(history.filter(m=>m.movimento_inventario_id===d.inventario_id).length,2);
 assert.equal((await req(path+'/cancelar','POST',{versao:d.versao,motivo:'Já finalizado'})).status,409);
 // Distinct approval keys also cannot apply a reference twice.
 let fresh=(await req('/inventarios','POST',creation,randomUUID())).data;const freshPath='/inventarios/'+fresh.inventario_id;
 fresh=(await req(freshPath,'PATCH',{versao:fresh.versao,itens:[{produto:product,lote_id:null,quantidade:3},{produto:product,lote_id:lote,quantidade:4}]})).data;
 fresh=(await req(freshPath+'/revisar','POST',{versao:fresh.versao})).data;
 const races=await Promise.all([1,2].map(()=>req(freshPath+'/aprovar','POST',{versao:fresh.versao,motivo:'Conferência simultânea'},randomUUID())));assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);assert.equal((await req(`/produto/${product}/lotes`)).data.saldo,7);
 let identify=(await req('/inventarios','POST',creation,randomUUID())).data;const identifyPath='/inventarios/'+identify.inventario_id;
 const registration={versao:identify.versao,produto:product,lote:{codigo:'000NOVO',validade:null},motivo:'Encontrado durante a conferência'},registerKey=randomUUID();
 const registered=await Promise.all([1,2].map(()=>req(identifyPath+'/lotes','POST',registration,registerKey)));assert.deepEqual(registered.map(r=>r.status),[201,201]);identify=registered[0].data;assert.equal(identify.itens[0].lotes.length,3);assert.equal((await req(`/produto/${product}/lotes`)).data.saldo,7);
 assert.equal((await req(identifyPath+'/lotes','POST',{...registration,lote:{codigo:'OUTRO'}},registerKey)).status,409);
 const workerBody={usuario_nome:'funcionario',usuario_nome_completo:'Operador inventário HTTP',usuario_email:'inventario@qa.local',usuario_password:'inventario-worker-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:true};assert.equal((await req('/acessos/usuarios','POST',workerBody)).status,201);
 const worker=(await req('/usuario/login','POST',{usuario_login:'funcionario',usuario_password:workerBody.usuario_password})).data.token;
 assert.equal((await req(identifyPath+'/lotes','POST',{...registration,versao:identify.versao},randomUUID(),worker)).status,403);
 for(const [url,method,body] of [['/inventarios','POST',creation],[path,'GET',undefined],[path,'PATCH',contagem],[path+'/aprovar','POST',approval]])assert.equal((await req(url,method,body,randomUUID(),worker)).status,403);
 console.log('PASS: lot inventory HTTP creation, cache/auth, versioned concurrent saves, same/distinct-key approvals exactly once, per-lot balances, consumption exclusion, immutable audit links and employee restrictions.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
