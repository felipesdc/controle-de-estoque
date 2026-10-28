const assert = require('node:assert/strict');
const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3106',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3106/v1';
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3106/health')).ok)break;}catch{} if(i===99)throw Error('API did not start');await new Promise(r=>setTimeout(r,100));}
 let token;
 async function req(path,method='GET',body,auth=token){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:res.status,data:res.status===204?null:await res.json()};}
 assert.equal((await req('/movimentacao-estoque/historico')).status,401);
 assert.equal((await req('/movimentacao-estoque/responsaveis')).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const p=await req('/produto','POST',{produto_descricao:'Produto HTTP',produto_quantidade_estoque:2});assert.equal(p.status,201);
 const users=await req('/acessos/usuarios'); const admin=users.data.itens.find(u=>u.usuario_nome==='admin');
 const page=await req(`/movimentacao-estoque/historico?produto=${p.data.produto_id}&responsavel=${admin.usuario_id}&tipo=entrada&q=HTTP`);
 assert.equal(page.status,200);assert.equal(page.data.total,1);assert.equal(page.data.itens[0].movimento_produto,'Produto HTTP');
 assert.equal((await req('/movimentacao-estoque/responsaveis')).data[0].nome,'admin');
 assert.ok(Array.isArray((await req('/movimentacao-estoque')).data),'legacy array remains');
 assert.equal((await req('/movimentacao-estoque/historico?inicio=2026-02-30')).status,400);
 assert.equal((await req('/movimentacao-estoque/historico?q[]=x')).status,400);
 await req('/usuario','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta',usuario_email:'consulta@test.local',usuario_password:'historico-test-2026',usuario_perfil_id:3,usuario_status:true});
 const consultation=(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'historico-test-2026'})).data.token;
 assert.ok(consultation);
 assert.equal((await req('/movimentacao-estoque/historico','GET',undefined,consultation)).status,200);
 assert.equal((await req('/movimentacao-estoque/responsaveis','GET',undefined,consultation)).status,200);
 assert.equal((await req(`/produto/${p.data.produto_id}`,'PATCH',{produto_estado:false})).status,200);
 assert.equal((await req(`/movimentacao-estoque/historico?produto=${p.data.produto_id}`)).data.total,1);
 console.log('PASS: authenticated paginated history, responsible lookup, combined filters, inactive products, read-only access and legacy compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
