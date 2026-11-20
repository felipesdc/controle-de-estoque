const assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3130',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3130/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3130/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 let token='';async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,headers:r.headers,data:await r.json()};}
 assert.equal((await req('/cadastros/categorias/opcoes')).status,401);
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const record=(await req('/cadastros/categorias','POST',{nome:'Categoria buscável'})).data;
 const found=await req('/cadastros/categorias/opcoes?q=busc&selecionado='+record.id);assert.equal(found.status,200);assert.equal(found.headers.get('cache-control'),'no-store');assert.equal(found.data.total,1);assert.equal(found.data.selecionado.id,record.id);assert.deepEqual(Object.keys(found.data.itens[0]).sort(),['id','nome']);
 for(const query of ['q[]=x','pagina=0','selecionado=x','extra=x'])assert.equal((await req('/cadastros/categorias/opcoes?'+query)).status,400);
 assert.equal((await req('/cadastros/inexistentes/opcoes')).status,404);
 await req('/acessos/usuarios','POST',{usuario_nome:'consulta_opcoes',usuario_email:'consulta@opcoes.local',usuario_nome_completo:'Consulta opções',usuario_password:'consulta-opcoes-only-2026',usuario_perfil_id:3});
 token=(await req('/usuario/login','POST',{usuario_login:'consulta_opcoes',usuario_password:'consulta-opcoes-only-2026'})).data.token;
 assert.equal((await req('/cadastros/categorias/opcoes')).status,200);
 assert.equal((await req('/cadastros/categorias','POST',{nome:'Não autorizada'})).status,403);
 console.log('PASS: authenticated lightweight options, no-store, search/selection, typed query validation, fixed catalog types and unchanged write permissions.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
