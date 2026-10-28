const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync('/tmp/estoque-entregas-');const path=dir+'/db.sqlite';
try {
 const init=spawnSync(process.execPath,['-e',"require('/app/dist/config/db')"],{env:{...process.env,SQLITE_PATH:path},encoding:'utf8'});assert.equal(init.status,0,init.stderr);
 const db=new DatabaseSync(path);db.exec(`DROP TABLE pi2_entrega_itens; DROP TABLE pi2_entregas_pedido;
 INSERT INTO pi2_fornecedores(fornecedor_id,fornecedor_nome) VALUES(1,'Anterior');
 INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_estado,produto_quantidade_estoque) VALUES(1,'Anterior',1,5);
 INSERT INTO pi2_pedidos(pedido_id,pedido_fornecedor_id,pedido_usuario_id,pedido_fluxo,pedido_versao,pedido_recebimento_chave,pedido_total_centavos) VALUES(1,1,1,'recebido',3,'recebimento-antigo-001',1000),(2,1,1,'recebido',3,'recebimento-antigo-002',1000);
 INSERT INTO pi2_itens_pedido(item_pedido_id,item_pedido_pedido_id,item_pedido_produto_id,item_pedido_quantidade) VALUES(1,1,1,5),(2,2,1,5);
 INSERT INTO pi2_movimentos_estoque(movimento_id,movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_data,movimento_usuario_id,movimento_saldo_anterior,movimento_saldo_posterior,movimento_item_pedido_id) VALUES(1,1,5,'entrada','2026-10-27T12:00:00Z',1,0,5,1),(2,1,5,'entrada','2026-10-27T12:00:00Z',1,0,5,2);
 INSERT INTO pi2_movimentos_estoque(movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_usuario_id,movimento_estorno_de,movimento_saldo_anterior,movimento_saldo_posterior) VALUES(1,5,'saida',1,2,5,0);
 PRAGMA user_version=4;`);db.close();
 const code=`const assert=require('node:assert/strict');const pool=require('/app/dist/config/db').default;const {obterPedido,transicionar}=require('/app/dist/services/pedidos');const p=obterPedido(1),estornado=obterPedido(2);assert.equal(p.itens[0].quantidade_recebida,5);assert.equal(p.itens[0].quantidade_pendente,0);assert.equal(p.itens[0].quantidade_devolvivel,5);assert.equal(p.entregas.length,0);assert.equal(estornado.itens[0].quantidade_devolvivel,0);assert.equal(estornado.itens[0].quantidade_pendente,0);assert.equal(transicionar(1,'receber',{versao:2},1,'recebimento-antigo-001').pedido_fluxo,'recebido');const devolvido=transicionar(1,'devolver',{versao:3,itens:[{item:1,quantidade:2}],motivo:'Devolução após migração'},1,'devolucao-pos-migracao01');assert.equal(devolvido.itens[0].quantidade_devolvida,2);assert.equal(devolvido.itens[0].quantidade_devolvivel,3);pool.query('SELECT produto_quantidade_estoque AS q FROM pi2_produtos').then(r=>assert.equal(r.rows[0].q,3));`;
 const child=spawnSync(process.execPath,['-e',code],{env:{...process.env,SQLITE_PATH:path},encoding:'utf8'});assert.equal(child.status,0,child.stderr);
 const migrated=new DatabaseSync(path);assert.equal(migrated.prepare('PRAGMA user_version').get().user_version,5);assert.equal(migrated.prepare('SELECT COUNT(*) AS n FROM pi2_movimentos_estoque').get().n,4);migrated.close();
 console.log('PASS: migration 4 to 5 preserves full receipts and historical reversals, supports retry and permits only valid post-migration returns.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
