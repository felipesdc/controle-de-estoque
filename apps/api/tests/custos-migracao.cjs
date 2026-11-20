const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const {spawnSync}=require('node:child_process');const fs=require('node:fs');
const dir=fs.mkdtempSync('/tmp/custos-migracao-'),file=dir+'/db.sqlite';
try{
 function run(code){const r=spawnSync(process.execPath,['-e',code],{env:{...process.env,SQLITE_PATH:file},encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 run("require('/app/dist/config/db')");let db=new DatabaseSync(file);
 db.exec(`INSERT INTO pi2_unidades(unidade_id,unidade_descricao) VALUES(1,'kg'); INSERT INTO pi2_precos(preco_id,preco_compra) VALUES(1,'99.99');
 INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_preco_id,produto_unidade_id,produto_estado,produto_quantidade_estoque,produto_codigo_barras) VALUES(1,'Produto preservado',1,1,1,4,'000123');
 INSERT INTO pi2_movimentos_estoque(movimento_id,movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_data,movimento_usuario_id,movimento_chave,movimento_saldo_anterior,movimento_saldo_posterior) VALUES(1,1,1,'saida','2026-11-17T12:00:00Z',1,'preservado-custo-01',5,4);
 INSERT INTO pi2_lotes(lote_id,produto_id,codigo,unidade_id,unidade,saldo_milesimos,criado_em,usuario_id) VALUES(1,1,'000L',1,'kg',4000,'2026-11-17',1);
 INSERT INTO pi2_inventarios(inventario_id,titulo,modo,estado,versao,criado_em,criado_por,criacao_chave,criacao_conteudo) VALUES(1,'Contagem aprovada','lotes','aprovado',4,'2026-11-17',1,'preservado-inv-01','{}');
 INSERT INTO pi2_inventario_itens(inventario_id,produto_id,descricao,unidade_id,unidade,saldo_milesimos,ultimo_movimento_id,contado_milesimos) VALUES(1,1,'Produto preservado',1,'kg',5000,0,4000);
 INSERT INTO pi2_inventario_lotes(inventario_id,produto_id,lote_id,codigo,saldo_milesimos,contado_milesimos,movimento_id) VALUES(1,1,1,'000L',5000,4000,1);
 INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em) VALUES('preservada-custos',1,9999999999);
 DROP TABLE pi2_auth_outbox; DROP TABLE pi2_auth_reset; DROP TABLE pi2_auth_desafios; DROP TABLE pi2_auth_mfa; DROP TABLE pi2_auth_eventos; DROP TABLE pi2_auth_limites; ALTER TABLE pi2_sessoes DROP COLUMN mfa_verificada; DROP TABLE pi2_custos_eventos;DROP TABLE pi2_custos_config;PRAGMA user_version=12;`);
 const names=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 const snapshot=d=>names.map(name=>({name,rows:d.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all().map(row=>{if(name==='pi2_sessoes')delete row.mfa_verificada;return row;})}));const before=snapshot(db);db.close();run("require('/app/dist/config/db')");db=new DatabaseSync(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);assert.deepEqual(snapshot(db),before);
 const cost=db.prepare('SELECT * FROM pi2_custos_eventos').get();assert.equal(cost.saldo_milesimos,4000);assert.equal(cost.valor_microcentavos,null);assert.equal(cost.natureza,'abertura');assert.equal(cost.movimento_id,null);assert.equal(cost.unidade,'kg');assert.ok(db.prepare('SELECT inicio FROM pi2_custos_config').get().inicio);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
 console.log('PASS: schema 12 to 14 preserves stock, lots, approved inventory links, prices, credentials and sessions; establishes unknown opening cost without replaying movements or inferring old price.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
