const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 const produtos=await req('/produto');
 for(const [nome,codigo] of [['Arroz integral','00012345'],['Café em grãos','00054321'],['Papel toalha','00000000'],['Copos descartáveis','CODE-128-A'],['Farinha de trigo','00999999'],['Molho de tomate','00999999'],['Produto sazonal','000OFF']]){
  const p=produtos.find(p=>p.produto_descricao.startsWith(nome));assert.ok(p,nome);
  await req('/produto/'+p.produto_id,'PATCH',{produto_codigo_barras:codigo});
 }
 assert.equal((await req('/catalogo/produtos/codigo?codigo=00012345')).produto_codigo_barras,'00012345');
 const duplicate=await fetch(base+'/catalogo/produtos/codigo?codigo=00999999',{headers:{Authorization:'Bearer '+token}});assert.equal(duplicate.status,409);
 console.log('Códigos QA: arroz 00012345; café 00054321; papel 00000000; copos CODE-128-A; duplicado 00999999; inativo 000OFF.');
})().catch(e=>{console.error(e);process.exitCode=1;});
