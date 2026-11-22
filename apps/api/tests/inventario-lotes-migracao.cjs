const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const {spawnSync}=require('node:child_process');const fs=require('node:fs');
const dir=fs.mkdtempSync('/tmp/inventario-lotes-migracao-'),file=dir+'/db.sqlite';
try{
 function boot(){const r=spawnSync(process.execPath,['-e',"require('/app/dist/config/db')"],{env:{...process.env,SQLITE_PATH:file},encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 boot();let db=new DatabaseSync(file);
 db.exec(`INSERT INTO pi2_unidades(unidade_id,unidade_descricao) VALUES(1,'kg'); INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_codigo_barras,produto_estado,produto_quantidade_estoque,produto_estoque_minimo) VALUES(1,'Preservado','000123',1,4,8);
 INSERT INTO pi2_movimentos_estoque(movimento_id,movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_data,movimento_usuario_id,movimento_chave,movimento_saldo_anterior,movimento_saldo_posterior) VALUES(1,1,1,'saida','2026-11-13T12:00:00Z',1,'movimento-preservado-01',5,4);
 INSERT INTO pi2_inventarios(inventario_id,titulo,estado,versao,criado_em,criado_por,finalizado_em,finalizado_por,motivo,criacao_chave,criacao_conteudo,aprovacao_chave,aprovacao_conteudo) VALUES(1,'Inventário anterior','aprovado',4,'2026-11-13T11:00:00Z',1,'2026-11-13T12:00:00Z',1,'Conferido','criacao-preservada','{}','aprovacao-preservada','{}');
 INSERT INTO pi2_inventario_itens(inventario_id,produto_id,descricao,saldo_milesimos,ultimo_movimento_id,contado_milesimos,movimento_id) VALUES(1,1,'Preservado',5000,0,4000,1);
 INSERT INTO pi2_inventario_eventos(inventario_id,acao,data,usuario_id,conteudo) VALUES(1,'aprovar','2026-11-13T12:00:00Z',1,'{}');
 UPDATE pi2_produtos SET produto_unidade_id=1 WHERE produto_id=1;
 UPDATE pi2_movimentos_estoque SET movimento_codigo_lido='000123' WHERE movimento_id=1;
 INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em) VALUES('sessao-preservada',1,9999999999);
 INSERT INTO pi2_lotes(lote_id,produto_id,codigo,validade,unidade_id,unidade,saldo_milesimos,criado_em,usuario_id) VALUES(1,1,'000LOTE','2028-02-29',1,'kg',4000,'2026-11-17',1);
 UPDATE pi2_movimentos_estoque SET movimento_lote_id=1 WHERE movimento_id=1;
 INSERT INTO pi2_inventarios(inventario_id,titulo,estado,versao,criado_em,criado_por,criacao_chave,criacao_conteudo) VALUES(2,'Contagem geral em andamento','aberto',2,'2026-11-17',1,'criacao-preservada-2','{}');
 INSERT INTO pi2_inventario_itens(inventario_id,produto_id,descricao,unidade_id,unidade,saldo_milesimos,ultimo_movimento_id,contado_milesimos) VALUES(2,1,'Preservado',1,'kg',4000,1,4000);
 DROP TABLE pi2_creditos_devolucao; DROP TABLE pi2_entrega_rateios; DROP TABLE pi2_entrega_custos; DROP TABLE pi2_auth_outbox; DROP TABLE pi2_auth_reset; DROP TABLE pi2_auth_desafios; DROP TABLE pi2_auth_mfa; DROP TABLE pi2_auth_eventos; DROP TABLE pi2_auth_limites; ALTER TABLE pi2_sessoes DROP COLUMN mfa_verificada; DROP TABLE pi2_custos_eventos; DROP TABLE pi2_custos_config; DROP TABLE pi2_inventario_lote_registros; DROP TABLE pi2_inventario_lotes; ALTER TABLE pi2_inventarios DROP COLUMN modo;
 PRAGMA user_version=11;`);
 const names=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 function snapshot(db){return names.map(name=>({name,rows:db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all().map(row=>{if(name==='pi2_sessoes')delete row.mfa_verificada;if(name==='pi2_inventarios')delete row.modo;if(name==='pi2_movimentos_estoque'){}return row;})}));}
 const before=snapshot(db);db.close();boot();db=new DatabaseSync(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,15);assert.deepEqual(snapshot(db),before);
 assert.equal(db.prepare('SELECT movimento_codigo_lido FROM pi2_movimentos_estoque').get().movimento_codigo_lido,'000123');
 assert.equal(db.prepare('SELECT movimento_unidade_registrada FROM pi2_movimentos_estoque').get().movimento_unidade_registrada,0);
 assert.equal(db.prepare('SELECT movimento_unidade_descricao FROM pi2_movimentos_estoque').get().movimento_unidade_descricao,null);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.equal(db.prepare('SELECT COUNT(*) AS total FROM pi2_inventario_lotes').get().total,0);assert.equal(db.prepare('SELECT saldo_milesimos FROM pi2_lotes').get().saldo_milesimos,4000);assert.ok(db.prepare('SELECT modo FROM pi2_inventarios').all().every(r=>r.modo==='produto'));assert.equal(db.prepare('SELECT contado_milesimos FROM pi2_inventario_itens WHERE inventario_id=2').get().contado_milesimos,4000);
 db.close();
 console.log('PASS: schema 11 to 14 preserves lots, stock, credentials, sessions, approved movements and open product counts without inventing lot references.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
