const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const {spawnSync}=require('node:child_process');const fs=require('node:fs');
const dir=fs.mkdtempSync('/tmp/inventario-migracao-');const file=dir+'/db.sqlite';
try{
 function boot(){const r=spawnSync(process.execPath,['-e',"require('/app/dist/config/db')"],{env:{...process.env,SQLITE_PATH:file},encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 boot();let db=new DatabaseSync(file);
 db.exec(`DROP TABLE pi2_creditos_devolucao; DROP TABLE pi2_entrega_rateios; DROP TABLE pi2_entrega_custos; DROP TABLE pi2_auth_outbox; DROP TABLE pi2_auth_reset; DROP TABLE pi2_auth_desafios; DROP TABLE pi2_auth_mfa; DROP TABLE pi2_auth_eventos; DROP TABLE pi2_auth_limites; ALTER TABLE pi2_sessoes DROP COLUMN mfa_verificada; DROP TABLE pi2_custos_eventos; DROP TABLE pi2_custos_config; DROP TABLE pi2_inventario_lote_registros; DROP TABLE pi2_inventario_lotes; ALTER TABLE pi2_inventarios DROP COLUMN modo; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_lote_id; DROP TABLE pi2_lotes; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_id; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_descricao; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_registrada; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_codigo_lido; DROP TABLE pi2_inventario_eventos;DROP TABLE pi2_inventario_itens;DROP TABLE pi2_inventarios;
 INSERT INTO pi2_produtos(produto_descricao,produto_estado,produto_quantidade_estoque,produto_estoque_minimo) VALUES('Preservado',1,12.125,20);
 INSERT INTO pi2_usuarios(usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status,usuario_operar_estoque) VALUES('funcionario','worker@qa.local','hash-preservado',3,1,1);
 INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em) VALUES('sessao-preservada',1,9999999999);
 PRAGMA user_version=7;`);
 // Persisted session columns and all rows must survive the additive migration.
 const tables=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 function snapshot(database){return tables.map(name=>({name,rows:database.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all().map(row=>{if(name==='pi2_sessoes')delete row.mfa_verificada;return row;})}));}
 const before=snapshot(db);db.close();boot();db=new DatabaseSync(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,15);assert.deepEqual(snapshot(db),before);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pi2_inventarios').get().n,0);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.equal(db.prepare('SELECT usuario_operar_estoque FROM pi2_usuarios WHERE usuario_nome=?').get('funcionario').usuario_operar_estoque,1);
 db.close();console.log('PASS: schema 7 to 14 preserves every existing table row and employee permission; creates empty inventory tables with valid foreign keys.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
