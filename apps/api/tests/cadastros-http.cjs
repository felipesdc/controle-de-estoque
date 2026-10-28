const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3104',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
  const base='http://127.0.0.1:3104/v1';
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3104/health')).ok)break;}catch{}if(i===99)throw new Error('API did not start');await new Promise(r=>setTimeout(r,100));}
  let token;
  async function req(path,method='GET',body,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:r.status===204?null:await r.json()};}
  assert.equal((await req('/cadastros/categorias')).status,401);
  token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
  const categories=await req('/categoria','POST',{categoria_descricao:'Alimentos'});
  assert.equal(categories.status,201);assert.ok(categories.data.categoria_id);
  assert.ok(Array.isArray((await req('/categoria')).data));
  assert.equal((await req('/cadastros/categorias','POST',{nome:'ALIMENTOS'})).status,409);
  assert.equal((await req('/cadastros/categorias','POST',{nome:' '})).status,400);
  assert.equal((await req('/cadastros/categorias?pagina=abc')).status,400);
  assert.equal((await req('/cadastros/unknown')).status,404);
  const unit=(await req('/cadastros/unidades','POST',{nome:'Unidade'})).data;
  const supplier=(await req('/cadastros/fornecedores','POST',{nome:'Fornecedor',contato:'fornecedor@test.local',endereco:'Rua de teste'})).data;
  const product=await req('/produto','POST',{produto_descricao:'Produto vinculado',produto_quantidade_estoque:0,produto_categoria_id:categories.data.categoria_id,produto_unidade_id:unit.id,produto_fornecedor_id:supplier.id});
  assert.equal(product.status,201);
  assert.equal((await req(`/cadastros/categorias/${categories.data.categoria_id}`,'DELETE')).status,409);
  assert.equal((await req(`/unidade/${unit.id}`,'DELETE')).status,409);
  assert.equal((await req(`/fornecedor/${supplier.id}`,'DELETE')).status,409);
  assert.equal((await req(`/cadastros/fornecedores/${supplier.id}`,'PATCH',{contato:'Novo contato'})).data.nome,'Fornecedor');
  assert.equal((await req('/cadastros/fornecedores?q=Novo')).data.total,1);
  const spare=(await req('/cadastros/categorias','POST',{nome:'Sem vínculos'})).data;
  assert.equal((await req(`/cadastros/categorias/${spare.id}`,'DELETE')).status,204);
  assert.equal((await req(`/cadastros/categorias/${spare.id}`,'DELETE')).status,404);
  const roles=[];
  for(const nome of ['Gerente','Consulta'])roles.push((await req('/perfil')).data.find(p=>p.perfil_nome===nome).perfil_id);
  const tokens=[];
  for(let i=0;i<2;i++){
    await req('/usuario','POST',{usuario_nome:`test${i}`,usuario_email:`test${i}@local`,usuario_password:'cadastros-test-2026',usuario_nome_completo:'Usuário de teste',usuario_perfil_id:roles[i],usuario_status:true,usuario_inscricao:new Date().toISOString()});
    tokens.push((await req('/usuario/login','POST',{usuario_login:`test${i}`,usuario_password:'cadastros-test-2026'})).data.token);
  }
  const [manager,readonly]=tokens;assert.ok(manager);assert.ok(readonly);
  assert.equal((await req('/cadastros/unidades','POST',{nome:'Quilograma'},manager)).status,201);
  assert.equal((await req('/usuario','GET',undefined,manager)).status,403);
  for(const tipo of ['categorias','unidades','fornecedores']){
    assert.equal((await req(`/cadastros/${tipo}`,'GET',undefined,readonly)).status,200);
    assert.equal((await req(`/cadastros/${tipo}`,'POST',{nome:'Bloqueado'},readonly)).status,403);
    assert.equal((await req(`/cadastros/${tipo}/1`,'PATCH',{nome:'Bloqueado'},readonly)).status,403);
    assert.equal((await req(`/cadastros/${tipo}/1`,'DELETE',undefined,readonly)).status,403);
  }
  for(const path of ['categoria','unidade','fornecedor','pedido','item-pedido','estado-pedido','historico-estado-pedido','preco']){
    assert.equal((await req(`/${path}`,'POST',{},readonly)).status,403,`${path} POST is protected`);
    assert.equal((await req(`/${path}/1`,'PUT',{},readonly)).status,403,`${path} PUT is protected`);
    assert.equal((await req(`/${path}/1`,'DELETE',undefined,readonly)).status,403,`${path} DELETE is protected`);
  }
  assert.equal((await req('/usuario','GET',undefined,readonly)).status,403);
  assert.equal((await req('/perfil','GET',undefined,readonly)).status,403);
  const concurrent=await Promise.all([1,2].map(()=>req('/cadastros/categorias','POST',{nome:'Duplicidade simultânea'},manager)));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
  console.log('PASS: authenticated contracts, legacy compatibility, linked deletion protection, admin/manager/consultation permissions on new and old routes, private identity endpoints and concurrent duplicate rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
