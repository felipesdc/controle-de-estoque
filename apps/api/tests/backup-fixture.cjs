const assert=require('node:assert/strict');
if(process.env.SQLITE_PATH!=='/data/backup-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@backup.local')throw Error('Disposable backup QA only');
const pool=require('/app/dist/config/db').default;
const {createProduto}=require('/app/dist/models/produto');
const {salvarPedido,transicionar}=require('/app/dist/services/pedidos');
const {salvarUsuario}=require('/app/dist/services/acessos');
(async()=>{
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome) VALUES ('Fornecedor QA')");
 const product=await createProduto('Arroz QA',null,null,null,null,2,null,'001234',true,1);
 salvarUsuario({usuario_nome:'funcionario',usuario_email:'worker@qa.local',usuario_nome_completo:'Funcionário preservado',usuario_password:'worker-backup-password-2026',usuario_perfil_id:3,usuario_status:true,usuario_operar_estoque:true},1);
 let p=salvarPedido({fornecedor:1,itens:[{produto:product.produto_id,quantidade:3,preco_centavos:199}]},1,'backup-qa-compra-001');
 p=transicionar(p.pedido_id,'confirmar',{versao:1},1,'');
 p=transicionar(p.pedido_id,'receber',{versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade:1}]},1,'backup-qa-receber-01');
 transicionar(p.pedido_id,'devolver',{versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade:.25}],motivo:'Avaria QA'},1,'backup-qa-devolver01');
 const login=await fetch('http://127.0.0.1:3000/v1/usuario/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_login:'admin',usuario_password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,200);
 require('node:fs').writeFileSync('/data/qa-token.txt',(await login.json()).token,{mode:0o600});
 assert.equal((await pool.query('SELECT produto_quantidade_estoque AS saldo FROM pi2_produtos')).rows[0].saldo,2.75);
 console.log('PASS: synthetic users, credentials, stock, partial order, receipt, return and history prepared.');
})().catch(e=>{console.error(e);process.exitCode=1});
