const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 assert.ok(!(await req('/produto')).some(p=>p.produto_codigo_barras==='LOTE-DEMO-001'),'Execute uma vez em base descartável.');
 const unidade=await req('/cadastros/unidades','POST',{nome:'Pote demonstrativo'}),fornecedor=await req('/cadastros/fornecedores','POST',{nome:'Fornecedor de lotes demonstrativos'});
 const produto=await req('/produto','POST',{produto_descricao:'Geleia · demonstração de lotes',produto_codigo_barras:'LOTE-DEMO-001',produto_unidade_id:unidade.id,produto_quantidade_estoque:4,produto_estado:true});
 let p=await req('/compras/pedidos','POST',{fornecedor:fornecedor.id,observacao:'Demonstração exclusiva do ambiente QA',itens:[{produto:produto.produto_id,quantidade:15,preco_centavos:1250}]});p=await req(`/compras/pedidos/${p.pedido_id}/confirmar`,'POST',{versao:p.pedido_versao});
 const hoje=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());const data=delta=>{const d=new Date(hoje+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
 for(const [codigo,validade,quantidade] of [['0001',data(-2),3],['0002',data(10),5],['0003',null,7]])p=await req(`/compras/pedidos/${p.pedido_id}/receber`,'POST',{versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade,lote:{codigo,validade}}]});
 const d=await req(`/produto/${produto.produto_id}/lotes`);assert.equal(d.sem_lote,4);assert.equal(d.identificado,15);assert.equal(d.total,3);
 console.log(`PASS: demonstração de lotes disponível em http://localhost:8081/home/lotes?produto=${produto.produto_id}; pedido #${p.pedido_id}. Saldo 19, sem lote 4, identificado 15; vencido, próximo e desconhecido.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
