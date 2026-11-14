const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,SQLITE_PATH:':memory:',PORT:'3118'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const origin='http://127.0.0.1:3118';for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,key,auth=token){const r=await fetch(origin+'/v1'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),headers:r.headers};}
 const lookup='/catalogo/produtos/codigo?codigo=00012345';assert.equal((await req(lookup)).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const p=(await req('/produto','POST',{produto_descricao:'Leitura HTTP',produto_quantidade_estoque:3,produto_codigo_barras:'00012345'})).data;
 const found=await req(lookup);assert.equal(found.status,200);assert.equal(found.headers.get('cache-control'),'no-store');assert.equal(found.data.produto_id,p.produto_id);assert.equal(found.data.produto_codigo_barras,'00012345');
 assert.equal((await req('/catalogo/produtos/codigo?codigo=12345')).status,404);assert.equal((await req('/catalogo/produtos/codigo')).status,400);assert.equal((await req('/catalogo/produtos/codigo?codigo[]=00012345')).status,400);
 for(const [nome,flag] of [['consulta',false],['funcionario',true]]){
  await req('/acessos/usuarios','POST',{usuario_nome:nome,usuario_nome_completo:nome,usuario_email:nome+'@codigo.local',usuario_password:'codigo-test-account-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:flag});
 }
 const login=async nome=>(await req('/usuario/login','POST',{usuario_login:nome,usuario_password:'codigo-test-account-2026'})).data.token;
 const consulta=await login('consulta'),worker=await login('funcionario');assert.ok(worker&&consulta);
 assert.equal((await req(lookup,'GET',undefined,undefined,consulta)).status,200);
 const movement={movimento_produto_id:p.produto_id,movimento_tipo:'saida',movimento_quantidade:1,movimento_codigo_lido:'00012345'};
 assert.equal((await req('/movimentacao-estoque','POST',movement,randomUUID(),consulta)).status,403);
 const key=randomUUID();const results=await Promise.all([req('/movimentacao-estoque','POST',movement,key,worker),req('/movimentacao-estoque','POST',movement,key,worker)]);
 assert.deepEqual(results.map(r=>r.status),[201,201]);assert.equal(results[0].data.movimento_id,results[1].data.movimento_id);assert.equal(results[0].data.movimento_codigo_lido,'00012345');
 assert.equal((await req('/produto/'+p.produto_id)).data.produto_quantidade_estoque,2);
 const history=(await req('/movimentacao-estoque/historico','GET',undefined,undefined,worker)).data.itens;assert.equal(history.find(i=>i.movimento_id===results[0].data.movimento_id).movimento_codigo_lido,'00012345');
 const duplicate=await req('/produto','POST',{produto_descricao:'Duplicado HTTP',produto_quantidade_estoque:4,produto_codigo_barras:'00012345'});assert.equal(duplicate.status,201);
 assert.equal((await req(lookup,'GET',undefined,undefined,worker)).status,409);
 assert.equal((await req('/movimentacao-estoque','POST',movement,randomUUID(),worker)).status,409,'duplicate created after lookup blocks new operation');
 assert.equal((await req('/movimentacao-estoque','POST',movement,key,worker)).data.movimento_id,results[0].data.movimento_id,'exact retry still returns original');
 assert.equal((await req('/movimentacao-estoque','POST',{...movement,movimento_codigo_lido:undefined},key,worker)).status,409);
 assert.equal((await req('/produto/'+p.produto_id)).data.produto_quantidade_estoque,2);
 console.log('PASS: authenticated lookup, zeros, no-cache, invalid query rejection, employee stock-only permission, concurrent scan retry once, history and revalidation of duplicates.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
