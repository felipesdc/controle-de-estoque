const assert = require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw new Error('Only run in the disposable QA environment.');
(async()=>{
  const base='http://127.0.0.1:3000/v1';
  const login=await fetch(base+'/usuario/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})});
  const {token}=await login.json();
  async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});const data=r.status===204?null:await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
  assert.equal((await req('/produto')).length,5,'Run after the dashboard fixture, once only.');
  const food=await req('/categoria','POST',{categoria_descricao:'Alimentos'});
  const supplies=await req('/categoria','POST',{categoria_descricao:'Descartáveis'});
  const unit=await req('/unidade','POST',{unidade_descricao:'Unidade'});
  for(let id=1;id<=5;id++)await req(`/produto/${id}`,'PATCH',{produto_categoria_id:id===3?supplies.categoria_id:food.categoria_id,produto_unidade_id:unit.unidade_id,produto_codigo_barras:`789000${id}`});
  for(let i=1;i<=12;i++){
    const p=await req('/produto','POST',{produto_descricao:`Item de apoio ${String(i).padStart(2,'0')}`,produto_quantidade_estoque:10,produto_categoria_id:supplies.categoria_id,produto_unidade_id:unit.unidade_id});
    if(i===12)await req(`/produto/${p.produto_id}`,'PATCH',{produto_estado:false});
  }
  const role=(await req('/perfil')).find(p=>p.perfil_nome==='Consulta');
  await req('/usuario','POST',{usuario_nome:'consulta',usuario_email:'consulta@qa.local',usuario_password:'catalogo-qa-consulta-2026',usuario_nome_completo:'Usuário de consulta',usuario_perfil_id:role.perfil_id,usuario_status:true,usuario_inscricao:new Date().toISOString()});
  const catalogo=await req('/catalogo/produtos');
  assert.equal(catalogo.total,16);assert.equal(catalogo.paginas,2);
  console.log('PASS: QA catalog prepared with 16 active products, 1 inactive, named categories/units and a read-only account.');
})().catch(e=>{console.error(e);process.exitCode=1;});
