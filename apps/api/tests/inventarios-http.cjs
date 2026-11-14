const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,SQLITE_PATH:':memory:',PORT:'3117'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const origin='http://127.0.0.1:3117';for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(origin+'/v1'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=r.status===204?null:await r.json();return {status:r.status,data,headers:r.headers};}
 assert.equal((await req('/inventarios')).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const a=(await req('/produto','POST',{produto_descricao:'Inventário HTTP A',produto_quantidade_estoque:4.125})).data;
 const b=(await req('/produto','POST',{produto_descricao:'Inventário HTTP B',produto_quantidade_estoque:0})).data;
 const creation={titulo:'Contagem HTTP',produtos:[a.produto_id,b.produto_id]},createKey=randomUUID();
 assert.equal((await req('/inventarios','POST',creation)).status,400);
 const created=await req('/inventarios','POST',creation,createKey);assert.equal(created.status,201);assert.equal(created.headers.get('cache-control'),'no-store');let d=created.data;
 assert.equal((await req('/inventarios','POST',creation,createKey)).data.inventario_id,d.inventario_id);
 const path='/inventarios/'+d.inventario_id;
 let response=await req(path,'PATCH',{versao:d.versao,itens:[{produto:a.produto_id,quantidade:3},{produto:b.produto_id,quantidade:1.25}]});assert.equal(response.status,200);d=response.data;
 response=await req(path+'/revisar','POST',{versao:d.versao});assert.equal(response.status,200);d=response.data;
 const approval={versao:d.versao,motivo:'Conferência concluída'},approvalKey=randomUUID();
 const approved=await Promise.all([req(path+'/aprovar','POST',approval,approvalKey),req(path+'/aprovar','POST',approval,approvalKey)]);assert.deepEqual(approved.map(r=>r.status),[200,200]);d=approved[0].data;
 assert.equal((await req('/produto/'+a.produto_id)).data.produto_quantidade_estoque,3);
 assert.equal((await req('/produto/'+b.produto_id)).data.produto_quantidade_estoque,1.25);
 assert.equal((await req(path+'/aprovar','POST',approval,randomUUID())).status,409);
 assert.equal((await req(path,'PATCH',{versao:d.versao,itens:[{produto:a.produto_id,quantidade:0}]})).status,409);
 const adjustments=d.itens.filter(i=>i.movimento_id);assert.equal(adjustments.length,2);
 const history=(await req('/movimentacao-estoque/historico')).data.itens.filter(i=>i.movimento_inventario_id===d.inventario_id);assert.equal(history.length,2);
 assert.equal((await req('/movimentacao-estoque/'+adjustments[0].movimento_id+'/estorno','POST',{motivo:'Não permitido'},randomUUID())).status,409);
 assert.equal((await req('/inventarios?estado=aprovado')).data.total,1);assert.equal((await req('/inventarios?pagina=0')).status,400);
 assert.equal((await req('/inventarios/nope')).status,400);assert.equal((await req('/inventarios/99999')).status,404);
 for(const [nome,flag] of [['consulta',false],['funcionario',true]]){
  await req('/acessos/usuarios','POST',{usuario_nome:nome,usuario_nome_completo:nome,usuario_email:nome+'@inventario.local',usuario_password:'inventario-test-account-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:flag});
  const other=(await req('/usuario/login','POST',{usuario_login:nome,usuario_password:'inventario-test-account-2026'})).data.token;assert.ok(other);
  assert.equal((await req('/inventarios','GET',undefined,undefined,other)).status,403);
  assert.equal((await req(path,'GET',undefined,undefined,other)).status,403);
  assert.equal((await req('/inventarios','POST',creation,randomUUID(),other)).status,403);
  assert.equal((await req(path+'/aprovar','POST',approval,approvalKey,other)).status,403);
 }
 console.log('PASS: authenticated manager-only inventory, HTTP lifecycle, concurrent exact approval once, immutable linked history, invalid routes/queries, employee/consultation rejection.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
