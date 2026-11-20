const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente base descartável de QA');
const pool=require('/app/dist/config/db').default;const {salvarCadastro}=require('/app/dist/services/cadastros');
(async()=>{
 const last={};for(const [tipo,table,id,field]of [['categorias','pi2_categorias','categoria_id','categoria_descricao'],['unidades','pi2_unidades','unidade_id','unidade_descricao'],['fornecedores','pi2_fornecedores','fornecedor_id','fornecedor_nome']])for(let i=1;i<=62;i++){
  const nome=`QA seleção ${tipo} ${String(i).padStart(3,'0')}`;
  const existing=(await pool.query(`SELECT * FROM ${table} WHERE ${field}=$1`,[nome])).rows[0];
  last[tipo]=existing?existing[id]:salvarCadastro(tipo,{nome}).id;
 }
 const base='http://127.0.0.1:3000/v1';const login=await fetch(base+'/usuario/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,200);const token=(await login.json()).token;
 const exists=(await pool.query("SELECT produto_id FROM pi2_produtos WHERE produto_descricao='QA seleção fora da primeira página'")).rows[0];
 if(!exists){const response=await fetch(base+'/produto',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({produto_descricao:'QA seleção fora da primeira página',produto_categoria_id:last.categorias,produto_unidade_id:last.unidades,produto_fornecedor_id:last.fornecedores,produto_quantidade_estoque:0,produto_estoque_minimo:0,produto_estado:true})});assert.equal(response.status,201,await response.text());}
 console.log('PASS: 62 opções adicionais em cada cadastro e produto com opções fora da primeira página preparados apenas em QA.');
})().catch(e=>{console.error(e);process.exitCode=1});
