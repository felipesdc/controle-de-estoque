const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3109',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3109/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3109/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,auth=token){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`} : {})},body:body===undefined?undefined:JSON.stringify(body)});}
 assert.equal((await req('/relatorios/estoque')).status,401);assert.equal((await req('/relatorios/estoque.csv')).status,401);
 token=(await(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).json()).token;
 for(let i=0;i<12;i++)assert.equal((await req('/produto','POST',{produto_descricao:'Relatório '+i,produto_quantidade_estoque:1.25,produto_codigo_barras:'000'+i})).status,201);
 const json=await req('/relatorios/estoque');assert.equal(json.status,200);assert.equal(json.headers.get('cache-control'),'no-store');const data=await json.json();assert.equal(data.total,12);assert.equal(data.itens.length,10);assert.equal(data.resumo.baixos,12);
 const csv=await req('/relatorios/estoque.csv?pagina=2');assert.equal(csv.status,200);assert.ok(csv.headers.get('content-type').includes('text/csv'));assert.ok(csv.headers.get('content-disposition').includes('attachment'));assert.equal(csv.headers.get('cache-control'),'no-store');assert.equal((await csv.text()).trim().split('\r\n').length,13);
 assert.equal((await req('/relatorios/estoque.csv?estado=invalid')).status,400);
 assert.equal((await req('/relatorios/estoque?q[]=x')).status,400);
 await req('/usuario','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta',usuario_email:'consulta@test.local',usuario_password:'relatorio-consulta-2026',usuario_perfil_id:3,usuario_status:true});
 const readonly=(await(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'relatorio-consulta-2026'})).json()).token;
 assert.ok(readonly);assert.equal((await req('/relatorios/estoque','GET',undefined,readonly)).status,200);assert.equal((await req('/relatorios/estoque.csv','GET',undefined,readonly)).status,200);
 console.log('PASS: authenticated JSON/CSV, consultation permissions, headers, full-filtered export and validation.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
