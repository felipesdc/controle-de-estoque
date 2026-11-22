const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3131',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3131/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3131/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{}),...(method==='POST'?{'Idempotency-Key':randomUUID()}: {})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json(),cache:r.headers.get('cache-control')};}
 assert.equal((await req('/produto/1/lotes')).status,401);token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).data.token;
 const supplier=(await req('/cadastros/fornecedores','POST',{nome:'FEFO QA'})).data.id;
 const id=(await req('/produto','POST',{produto_descricao:'Produto FEFO HTTP',produto_estado:true,produto_quantidade_estoque:4})).data.produto_id;
 const today=(await req(`/produto/${id}/lotes`)).data.data_referencia;const date=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 let order=(await req('/compras/pedidos','POST',{fornecedor:supplier,itens:[{produto:id,quantidade:7,preco_centavos:100}]})).data;order=(await req(`/compras/pedidos/${order.pedido_id}/confirmar`,'POST',{versao:order.pedido_versao})).data;
 for(const [codigo,validade,quantidade]of [['000V',date(-1),1],['000H',today,2],['000F',date(1),3],['000S',null,1]])order=(await req(`/compras/pedidos/${order.pedido_id}/receber`,'POST',{versao:order.pedido_versao,itens:[{item:order.itens[0].item_pedido_id,quantidade,lote:{codigo,validade}}]})).data;
 const advice=await req(`/produto/${id}/lotes?q=missing`);assert.equal(advice.status,200);assert.equal(advice.cache,'no-store');assert.equal(advice.data.itens.length,0);assert.equal(advice.data.retirada.lote.codigo,'000H');assert.equal(advice.data.retirada.avisos.vencidos,1);assert.equal(advice.data.retirada.avisos.sem_validade,1);
 const employee=await req('/acessos/usuarios','POST',{usuario_nome:'fefo_worker',usuario_email:'worker@fefo.local',usuario_nome_completo:'Funcionário FEFO',usuario_password:'fefo-worker-only-2026',usuario_operar_estoque:true});assert.equal(employee.status,201);
 const worker=(await req('/usuario/login','POST',{usuario_login:'fefo_worker',usuario_password:'fefo-worker-only-2026'})).data.token;
 assert.equal((await req(`/produto/${id}/lotes`,'GET',undefined,worker)).data.retirada.lote.lote_id,advice.data.retirada.lote.lote_id);
 const body={movimento_produto_id:id,movimento_tipo:'saida',movimento_quantidade:2,movimento_lote_id:advice.data.retirada.lote.lote_id};
 assert.equal((await req('/movimentacao-estoque','POST',body)).status,201);
 assert.equal((await req('/movimentacao-estoque','POST',body,worker)).status,409,'another user consumed suggested balance; no reservation exists');
 const fresh=(await req(`/produto/${id}/lotes`,'GET',undefined,worker)).data;assert.equal(fresh.retirada.lote.codigo,'000F');assert.equal(fresh.saldo,9);assert.equal(fresh.sem_lote,4);
 await req('/acessos/usuarios','POST',{usuario_nome:'fefo_reader',usuario_email:'reader@fefo.local',usuario_nome_completo:'Consulta FEFO',usuario_password:'fefo-reader-only-2026'});
 const reader=(await req('/usuario/login','POST',{usuario_login:'fefo_reader',usuario_password:'fefo-reader-only-2026'})).data.token;assert.equal((await req(`/produto/${id}/lotes`,'GET',undefined,reader)).status,200);assert.equal((await req('/movimentacao-estoque','POST',body,reader)).status,403);
 console.log('PASS: authenticated no-store global lot advice, receipts/expiry, employee read access, atomic stale suggestion rejection, preserved stock without auto fallback and consultation cannot write.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
