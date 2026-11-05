const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3109',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3109/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3109/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,auth=token){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {})},body:body===undefined?undefined:JSON.stringify(body)});}
 assert.equal((await req('/compras/reposicao')).status,401);
 token=(await(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).json()).token;
 assert.equal((await req('/produto','POST',{produto_descricao:'Reposição HTTP',produto_quantidade_estoque:1.25,produto_estoque_minimo:3})).status,201);
 const response=await req('/compras/reposicao');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const r=await response.json();assert.equal(r.total,1);assert.equal(r.itens[0].sugestao,1.75);
 assert.equal((await req('/compras/reposicao?pagina=0')).status,400);
 assert.equal((await req('/compras/reposicao?q[]=x')).status,400);
 await req('/usuario','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta',usuario_email:'consulta@test.local',usuario_password:'reposicao-consulta-2026',usuario_perfil_id:3,usuario_status:true});
 const readonly=(await(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'reposicao-consulta-2026'})).json()).token;
 assert.ok(readonly);assert.equal((await req('/compras/reposicao','GET',undefined,readonly)).status,200);
 assert.equal((await req('/compras/pedidos','POST',{fornecedor:1,itens:[]},readonly)).status,403);
 console.log('PASS: replenishment requires authentication, permits consultation, rejects invalid queries and keeps purchase creation manager-only.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
