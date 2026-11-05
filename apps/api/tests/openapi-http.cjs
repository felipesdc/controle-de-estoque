const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3115',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const origin='http://127.0.0.1:3115';for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(i===99)throw Error('API not ready');await new Promise(r=>setTimeout(r,100));}
 const response=await fetch(origin+'/api-docs/openapi.json');assert.equal(response.status,200);const spec=await response.json();assert.equal(spec.servers[0].url,'/v1');assert.ok(spec.components.securitySchemes.bearerAuth);
 const ui=await fetch(origin+'/api-docs/');assert.equal(ui.status,200);assert.ok(!(await ui.text()).includes('cdnjs.cloudflare.com'));
 assert.equal((await fetch(origin+'/api-docs/swagger-ui.css')).status,200);
 let token;async function req(path,method='GET',body,headers={}){return fetch(origin+'/v1'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});}
 token=(await(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).json()).token;assert.ok(token);
 for(const path of ['/sessao','/dashboard','/catalogo/produtos','/compras/reposicao','/compras/pedidos','/relatorios/estoque','/acessos/usuarios','/acessos/perfis','/movimentacao-estoque/historico','/cadastros/categorias'])assert.equal((await req(path)).status,200,path);
 const product=await req('/produto','POST',{produto_descricao:'Contrato documentado',produto_estoque_minimo:2.5,produto_quantidade_estoque:1,produto_precos:{compra_centavos:100,venda_centavos:200}});assert.equal(product.status,201);const p=await product.json();assert.equal(p.produto_estoque_minimo,2.5);
 assert.equal((await req('/produto/'+p.produto_id,'PATCH',{produto_estoque_minimo:3})).status,200);
 assert.equal((await req('/produto/'+p.produto_id+'/precos')).status,200);
 assert.equal((await req('/pedido','POST',{})).status,405);
 const csv=await req('/relatorios/estoque.csv');assert.ok(csv.headers.get('content-type').includes('text/csv'));
 const out=await req('/sessao/sair','POST');assert.equal(out.status,204);assert.equal((await req('/sessao')).status,401);
 console.log('PASS: Swagger JSON/assets served locally, current authenticated routes, documented product fields, legacy 405, CSV and session revocation.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
