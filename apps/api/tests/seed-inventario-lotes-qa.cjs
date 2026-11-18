const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 const produto=(await req('/produto')).find(p=>p.produto_codigo_barras==='LOTE-DEMO-001');assert.ok(produto,'Execute após seed-lotes-qa.cjs.');
 const ids=(await req('/inventarios')).itens;assert.ok(!ids.some(i=>i.titulo==='Conferência de geleia por lote'),'Execute uma vez.');
 let d=await req('/inventarios','POST',{titulo:'Conferência de geleia por lote',produtos:[produto.produto_id],modo:'lotes'});
 d=await req('/inventarios/'+d.inventario_id+'/lotes','POST',{versao:d.versao,produto:produto.produto_id,lote:{codigo:'0004',validade:null},motivo:'Lote encontrado durante conferência demonstrativa'});
 d=await req('/inventarios/'+d.inventario_id,'PATCH',{versao:d.versao,itens:d.itens[0].lotes.map(l=>({produto:produto.produto_id,lote_id:l.lote_id,quantidade:l.codigo===null?3:l.codigo==='0001'?2:l.codigo==='0002'?6:l.codigo==='0003'?7:1}))});
 d=await req('/inventarios/'+d.inventario_id+'/revisar','POST',{versao:d.versao});assert.equal(d.estado,'revisao');assert.equal(d.itens[0].contado,19);assert.equal(d.itens[0].lotes.length,5);
 console.log(`PASS: inventário detalhado #${d.inventario_id} pronto para revisar em http://localhost:8081/home/inventarios?id=${d.inventario_id}. Referência 19, contado 19; quatro divergências entre lotes/sem lote, incluindo lote encontrado na conferência. Nenhum ajuste aplicado.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
