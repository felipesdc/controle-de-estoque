const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {DatabaseSync}=require('node:sqlite');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente demonstração isolada.');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
 token=(await req('/usuario/login','POST',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 assert.ok(!(await req('/produto')).some(p=>p.produto_codigo_barras==='CUSTO-DEMO-001'),'Execute uma vez.');
 const unit=await req('/cadastros/unidades','POST',{nome:'Pacote demonstrativo de custos'});
 const a=await req('/produto','POST',{produto_descricao:'Café · custo médio demonstrativo',produto_codigo_barras:'CUSTO-DEMO-001',produto_unidade_id:unit.id,produto_quantidade_estoque:0,produto_estado:true});
 const hoje=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()),dia=n=>{const d=new Date(hoje+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const db=new DatabaseSync(process.env.SQLITE_PATH);db.prepare('UPDATE pi2_custos_config SET inicio=? WHERE id=1').run(dia(-2)+'T03:00:00Z');db.prepare('UPDATE pi2_custos_eventos SET data=? WHERE produto_id=?').run(dia(-2)+'T03:00:00Z',a.produto_id);
 for(const [q,custo,delta] of [[10,1000,-2],[10,2000,-1],[4,undefined,0]]){
  const m=await req('/movimentacao-estoque','POST',{movimento_produto_id:a.produto_id,movimento_tipo:custo===undefined?'saida':'entrada',movimento_quantidade:q,...(custo===undefined?{}:{movimento_custo_unitario_centavos:custo}),movimento_observacao:'Demonstração sintética de custos por dia'});
  db.prepare('UPDATE pi2_custos_eventos SET data=? WHERE movimento_id=?').run(dia(delta)+'T15:00:00Z',m.movimento_id);
 }
 await req('/produto','POST',{produto_descricao:'Custo desconhecido · demonstração',produto_codigo_barras:'CUSTO-DEMO-002',produto_unidade_id:unit.id,produto_quantidade_estoque:3,produto_estado:true});
 const b=await req('/produto','POST',{produto_descricao:'Saldo avaliado · demonstração de custo',produto_unidade_id:unit.id,produto_quantidade_estoque:5,produto_estado:true});
 const ref=(await req('/relatorios/custos?q='+encodeURIComponent('Saldo avaliado'))).itens.find(i=>i.produto_id===b.produto_id);await req('/produto/'+b.produto_id+'/custo-base','POST',{evento_id:ref.evento_id,unitario_centavos:5000,motivo:'Valor demonstrativo confirmado em documento fictício'});
 const r=await req('/relatorios/custos?q='+encodeURIComponent('Café · custo médio demonstrativo'));assert.equal(r.itens[0].saldo,16);assert.equal(r.itens[0].valor_reais,'240.00');assert.equal(r.itens[0].custo_medio_reais,'15.000000');const h=await req('/relatorios/custos/evolucao?inicio='+dia(-2)+'&fim='+hoje+'&q='+encodeURIComponent('Café · custo médio demonstrativo'));assert.deepEqual(h.itens.map(i=>i.valor_conhecido_reais),['100.00','300.00','240.00']);db.close();
 console.log('PASS: demonstração em http://localhost:8081/home/relatorios/custos; café com saldo 16, custo médio R$15 e valor R$240; evolução sintética R$100 → R$300 → R$240, saldo desconhecido e avaliação justificada. Datas alteradas apenas nesta base descartável.');
})().catch(e=>{console.error(e);process.exitCode=1;});
