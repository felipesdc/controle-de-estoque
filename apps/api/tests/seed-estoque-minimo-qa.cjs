const assert = require('node:assert/strict');
if (process.env.SQLITE_PATH !== '/data/dashboard-qa.sqlite' || process.env.ADMIN_EMAIL !== 'qa@dashboard.local') throw new Error('Use somente a base demonstrativa isolada.');
(async () => {
 const base='http://127.0.0.1:3000/v1';
 const login=await fetch(base+'/usuario/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})});
 assert.ok(login.ok); const {token}=await login.json();
 async function req(path,method='GET',body) {
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;
 }
 assert.equal((await req('/produto')).length,5,'Execute após seed-dashboard-qa.cjs, uma única vez.');
 const categoria=await req('/categoria','POST',{categoria_descricao:'Demonstração de reposição'});
 const unidade=await req('/unidade','POST',{unidade_descricao:'Unidade'});
 const kg=await req('/unidade','POST',{unidade_descricao:'Quilograma'});
 for (const [id,minimo] of [[1,8],[2,4],[3,6],[4,15],[5,6]]) await req('/produto/'+id,'PATCH',{produto_estoque_minimo:minimo,produto_categoria_id:categoria.categoria_id,produto_unidade_id:unidade.unidade_id});
 const samples=[
  ['Café em grãos · abaixo do mínimo',1.25,2.5,kg.unidade_id,true],
  ['Açúcar · exatamente no mínimo',5,5,kg.unidade_id,true],
  ['Copos descartáveis · estoque confortável',120,40,unidade.unidade_id,true],
  ['Guardanapos · zerado sem alerta',0,0,unidade.unidade_id,true],
  ['Produto sazonal · inativo',1,10,unidade.unidade_id,false],
 ];
 for(const [nome,saldo,minimo,unit,ativo] of samples){
  const p=await req('/produto','POST',{produto_descricao:nome,produto_quantidade_estoque:saldo,produto_estoque_minimo:minimo,produto_unidade_id:unit,produto_categoria_id:categoria.categoria_id,produto_precos:{compra_centavos:1250,venda_centavos:1990}});
  if(!ativo)await req('/produto/'+p.produto_id,'PATCH',{produto_estado:false});
 }
 const dashboard=await req('/dashboard');
 assert.equal(dashboard.totais.produtos_ativos,9);
 assert.equal(dashboard.totais.estoque_baixo,3);
 assert.equal((await req('/catalogo/produtos?estoque=zerado')).total,2);
 assert.equal((await req('/relatorios/estoque')).resumo.baixos,3);
 console.log('Demonstração pronta: 9 ativos, 1 inativo, 3 abaixo do mínimo, 2 zerados; igualdade e mínimo zero sem alerta.');
})().catch(e=>{console.error(e);process.exitCode=1;});
