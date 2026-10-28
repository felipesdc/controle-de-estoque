const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const child = spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3103',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
  const base='http://127.0.0.1:3103/v1';
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3103/health')).ok)break;}catch{} if(i===99)throw new Error('API did not start');await new Promise(r=>setTimeout(r,100));}
  let token;
  async function req(path,method='GET',body,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:r.status===204?null:await r.json()};}
  assert.equal((await req('/catalogo/produtos')).status,401);
  token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
  for(const body of [{produto_descricao:'bad date',produto_data_validade:'2026-02-30'},{produto_descricao:'bad ref',produto_categoria_id:999},{produto_descricao:'bad state',produto_estado:'true'}])assert.equal((await req('/produto','POST',body)).status,400);
  assert.equal((await req('/catalogo/produtos')).data.total,0,'invalid creation has no side effects');
  const product=await req('/produto','POST',{produto_descricao:'Produto HTTP',produto_quantidade_estoque:2,produto_data_validade:'2028-02-29'});
  assert.equal(product.status,201);
  const id=product.data.produto_id;
  assert.ok(Array.isArray((await req('/produto')).data),'legacy endpoint keeps array response');
  const edit=await req(`/produto/${id}`,'PATCH',{produto_descricao:'Produto editado',produto_codigo_barras:'789HTTP'});
  assert.equal(edit.status,200);assert.equal(edit.data.produto_quantidade_estoque,2);
  assert.equal((await req(`/produto/${id}`,'PATCH',{produto_quantidade_estoque:100})).status,400);
  assert.equal((await req(`/produto/${id}`,'PATCH',{produto_estado:false})).status,200);
  assert.equal((await req('/catalogo/produtos')).data.total,0);
  assert.equal((await req('/catalogo/produtos?estado=inativos')).data.total,1);
  assert.equal((await req(`/produto/${id}`,'PATCH',{produto_estado:true})).status,200);
  assert.equal((await req('/catalogo/produtos?q=789HTTP')).data.total,1);
  assert.equal((await req('/catalogo/produtos?pagina=abc')).status,400);
  const role=(await req('/perfil')).data.find(p=>p.perfil_nome==='Consulta').perfil_id;
  await req('/usuario','POST',{usuario_nome:'consulta',usuario_email:'consulta@test.local',usuario_password:'catalogo-test-123',usuario_nome_completo:'Consulta',usuario_perfil_id:role,usuario_status:true,usuario_inscricao:new Date().toISOString()});
  const readonly=(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'catalogo-test-123'})).data.token;
  assert.ok(readonly);
  assert.equal((await req('/catalogo/produtos','GET',undefined,readonly)).status,200);
  assert.equal((await req(`/produto/${id}`,'PATCH',{produto_estado:false},readonly)).status,403);
  console.log('PASS: authenticated catalog contract, legacy compatibility, creation validation, metadata patch, activation and read-only API permissions.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
