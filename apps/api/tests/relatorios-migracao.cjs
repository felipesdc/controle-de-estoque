const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const {spawnSync}=require('node:child_process');const fs=require('node:fs');
const dir=fs.mkdtempSync('/tmp/relatorios-migracao-'),file=dir+'/db.sqlite';
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
 ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_id; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_descricao; ALTER TABLE pi2_movimentos_estoque DROP COLUMN movimento_unidade_registrada;
 PRAGMA user_version=9;`);
 const names=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 function snapshot(db){return names.map(name=>({name,rows:db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all().map(row=>{if(name==='pi2_movimentos_estoque'){for(const column of ['movimento_unidade_id', 'movimento_unidade_descricao', 'movimento_unidade_registrada'])delete row[column];}return row;})}));}
 const before=snapshot(db);db.close();boot();db=new DatabaseSync(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,10);assert.deepEqual(snapshot(db),before);
 assert.equal(db.prepare('SELECT movimento_codigo_lido FROM pi2_movimentos_estoque').get().movimento_codigo_lido,'000123');
 assert.equal(db.prepare('SELECT movimento_unidade_registrada FROM pi2_movimentos_estoque').get().movimento_unidade_registrada,0);
 assert.equal(db.prepare('SELECT movimento_unidade_descricao FROM pi2_movimentos_estoque').get().movimento_unidade_descricao,null);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
 console.log('PASS: schema 9 to 10 preserves existing rows, scanned code, approved inventory links, balances, sessions and credentials without inventing historical units.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
