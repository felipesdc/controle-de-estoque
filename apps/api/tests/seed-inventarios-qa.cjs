const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 assert.equal((await req('/inventarios')).total,0,'Execute uma vez após o mock de estoque mínimo.');
 const produtos=await req('/produto');const arroz=produtos.find(p=>p.produto_descricao.startsWith('Arroz integral'));const papel=produtos.find(p=>p.produto_descricao.startsWith('Papel toalha'));const copos=produtos.find(p=>p.produto_descricao.startsWith('Copos descartáveis'));assert.ok(arroz&&papel&&copos);
 let d=await req('/inventarios','POST',{titulo:'Conferência concluída — descartáveis',produtos:[copos.produto_id]});
 d=await req('/inventarios/'+d.inventario_id,'PATCH',{versao:d.versao,itens:[{produto:copos.produto_id,quantidade:118}]});
 d=await req('/inventarios/'+d.inventario_id+'/revisar','POST',{versao:d.versao});
 d=await req('/inventarios/'+d.inventario_id+'/aprovar','POST',{versao:d.versao,motivo:'Contagem demonstrativa: duas unidades avariadas.'});assert.equal(d.estado,'aprovado');
 d=await req('/inventarios','POST',{titulo:'Contagem da despensa — pronta para revisão',produtos:[arroz.produto_id,papel.produto_id]});
 d=await req('/inventarios/'+d.inventario_id,'PATCH',{versao:d.versao,itens:[{produto:arroz.produto_id,quantidade:1.5},{produto:papel.produto_id,quantidade:2}]});
 d=await req('/inventarios/'+d.inventario_id+'/revisar','POST',{versao:d.versao});assert.equal(d.estado,'revisao');
 console.log('Demonstração: inventário #1 aprovado com saída de 2 copos; #2 em revisão com diferenças de arroz e papel.');
})().catch(e=>{console.error(e);process.exitCode=1;});
