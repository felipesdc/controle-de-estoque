const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync('/tmp/estoque-pedidos-');const path=dir+'/db.sqlite';
try{
 const db=new DatabaseSync(path);db.exec(require('/app/dist/config/schema').schema);
 db.exec(`INSERT INTO pi2_perfis(perfil_id,perfil_nome) VALUES(1,'Administrador');
 INSERT INTO pi2_usuarios(usuario_id,usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status) VALUES(1,'admin','admin@localhost','hash preservado',1,1);
 INSERT INTO pi2_fornecedores(fornecedor_id,fornecedor_nome) VALUES(1,'Antigo');
 INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_quantidade_estoque,produto_estado) VALUES(1,'Preservado',15,1);
 INSERT INTO pi2_estados_pedido(estado_pedido_id,estado_pedido_descricao) VALUES(1,'Concluído antigo');
 INSERT INTO pi2_pedidos(pedido_id,pedido_fornecedor_id,pedido_estado_id,pedido_total) VALUES(1,1,1,123.45);
 INSERT INTO pi2_itens_pedido(item_pedido_id,item_pedido_pedido_id,item_pedido_produto_id,item_pedido_quantidade,item_pedido_total) VALUES(1,1,1,5,123.45);
 INSERT INTO pi2_historico_estados_pedido(historico_pedido_id,historico_estado_id,historico_observacao) VALUES(1,1,'Registro anterior');
 PRAGMA user_version=1;`);db.close();
 const child=spawnSync(process.execPath,['-e',"require('/app/dist/config/db')"],{env:{...process.env,SQLITE_PATH:path},encoding:'utf8'});assert.equal(child.status,0,child.stderr);
 const migrated=new DatabaseSync(path);assert.equal(migrated.prepare('PRAGMA user_version').get().user_version,6);
 const order=migrated.prepare('SELECT * FROM pi2_pedidos').get();assert.equal(order.pedido_fluxo,null);assert.equal(order.pedido_total,123.45);assert.equal(order.pedido_estado_id,1);assert.equal(order.pedido_total_centavos,null);
 assert.equal(migrated.prepare('SELECT produto_quantidade_estoque AS saldo FROM pi2_produtos').get().saldo,15);
 assert.equal(migrated.prepare('SELECT COUNT(*) AS n FROM pi2_movimentos_estoque').get().n,0);
 assert.equal(migrated.prepare('SELECT COUNT(*) AS n FROM pi2_eventos_pedido').get().n,0);
 assert.equal(migrated.prepare('SELECT item_pedido_quantidade AS q FROM pi2_itens_pedido').get().q,5);
 assert.equal(migrated.prepare('SELECT historico_observacao AS obs FROM pi2_historico_estados_pedido').get().obs,'Registro anterior');migrated.close();
 console.log('PASS: schema 5 preserves legacy orders, items, states, history, credentials and balances without receiving old purchases.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
