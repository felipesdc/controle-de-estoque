const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3119',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3119';for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,auth=token){return fetch(base+'/v1'+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(auth?{Authorization:'Bearer '+auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
 for(const kind of ['consumo','compras'])for(const suffix of ['', '.csv'])assert.equal((await req('/relatorios/'+kind+suffix)).status,401);
 token=(await(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).json()).token;
 const unidade=(await(await req('/cadastros/unidades','POST',{nome:'Unidade'})).json()).id;
 const ids=[];for(let i=0;i<12;i++){const p=await(await req('/produto','POST',{produto_descricao:'Relatório período '+i,produto_quantidade_estoque:10,produto_unidade_id:unidade})).json();ids.push(p.produto_id);assert.equal((await req('/movimentacao-estoque','POST',{movimento_produto_id:p.produto_id,movimento_quantidade:1.25,movimento_tipo:'saida'})).status,201);}
 const supplier=(await(await req('/cadastros/fornecedores','POST',{nome:'Fornecedor relatório'})).json()).id;
 let p=await(await req('/compras/pedidos','POST',{fornecedor:supplier,itens:ids.map(id=>({produto:id,quantidade:2,preco_centavos:100}))})).json();p=await(await req('/compras/pedidos/'+p.pedido_id+'/confirmar','POST',{versao:p.pedido_versao})).json();
 for(const kind of ['consumo','compras']){
  const response=await req('/relatorios/'+kind);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const d=await response.json();assert.equal(d.total,12);assert.equal(d.itens.length,10);
  const second=await(await req('/relatorios/'+kind+'?pagina=2')).json();assert.equal(second.itens.length,2);assert.deepEqual(second.resumo,d.resumo,'summary covers all pages');
  const csv=await req('/relatorios/'+kind+'.csv?pagina=2');assert.equal(csv.status,200);assert.ok(csv.headers.get('content-type').includes('text/csv'));assert.ok(csv.headers.get('content-disposition').includes(kind+'.csv'));assert.equal(csv.headers.get('cache-control'),'no-store');const bytes=Buffer.from(await csv.arrayBuffer());assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf');assert.equal(bytes.toString().trim().split('\r\n').length,13,'CSV contains all pages');
  assert.equal((await req('/relatorios/'+kind+'?inicio=2026-02-30')).status,400);assert.equal((await req('/relatorios/'+kind+'?q[]=x')).status,400);
 }
 assert.equal((await req('/acessos/usuarios','POST',{usuario_nome:'consulta',usuario_nome_completo:'Consulta QA',usuario_email:'consulta@relatorio.local',usuario_password:'relatorio-periodo-consulta',usuario_perfil_id:3,usuario_status:true})).status,201);
 const readonly=(await(await req('/usuario/login','POST',{usuario_login:'consulta',usuario_password:'relatorio-periodo-consulta'})).json()).token;assert.ok(readonly);
 for(const kind of ['consumo','compras'])for(const suffix of ['', '.csv'])assert.equal((await req('/relatorios/'+kind+suffix,'GET',undefined,readonly)).status,200);
 assert.equal((await req('/compras/pedidos','POST',{fornecedor:supplier,itens:[]},readonly)).status,403);
 console.log('PASS: period reports JSON/CSV, auth/consultation, unchanged permissions, server pagination, all-selection summaries/export, headers/BOM and query validation.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
