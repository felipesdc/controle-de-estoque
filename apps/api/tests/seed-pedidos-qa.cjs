const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('QA environment only');
(async()=>{
 const base='http://127.0.0.1:3000/v1';let token;
 async function req(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});assert.ok(r.ok,`${path}: ${r.status}`);return r.json();}
 token=(await req('/usuario/login',{usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})).token;
 assert.equal((await req('/compras/pedidos')).total,0);
 await req('/cadastros/fornecedores',{nome:'Fornecedor de teste QA'});
 const unit=await req('/cadastros/unidades',{nome:'kg'});
 await req('/produto',{produto_descricao:'Arroz QA',produto_quantidade_estoque:0,produto_unidade_id:unit.id});
 await req('/produto',{produto_descricao:'Feijão QA',produto_quantidade_estoque:0,produto_unidade_id:unit.id});
 console.log('PASS: supplier and two zero-stock products prepared exclusively in disposable purchase QA.');
})().catch(e=>{console.error(e);process.exitCode=1});
