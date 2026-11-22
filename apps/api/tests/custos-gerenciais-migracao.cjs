const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),{spawnSync}=require('node:child_process'),fs=require('node:fs');
const dir=fs.mkdtempSync('/tmp/gerenciais-migracao-'),file=dir+'/db.sqlite';
try{
 const run=()=>{const r=spawnSync(process.execPath,['-e',"require('/app/dist/config/db')"],{env:{...process.env,SQLITE_PATH:file},encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
 run();let db=new DatabaseSync(file);db.exec("DROP TABLE pi2_reembolsos_devolucao; DROP TABLE pi2_creditos_devolucao; DROP TABLE pi2_entrega_rateios; DROP TABLE pi2_entrega_custos;INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em,mfa_verificada) VALUES('gerencial-preservada',1,9999999999,1);PRAGMA user_version=14;");
 const nomes=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 const snapshot=d=>nomes.map(n=>({nome:n,rows:d.prepare(`SELECT * FROM ${n} ORDER BY rowid`).all()}));const before=snapshot(db);db.close();run();db=new DatabaseSync(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,16);assert.deepEqual(snapshot(db),before);
 for(const name of ['pi2_creditos_devolucao','pi2_entrega_rateios','pi2_entrega_custos'])assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${name}`).get().n,0);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();run();
 console.log('PASS: schema 14→15 is additive and repeatable; all prior rows, sessions and MFA verification remain identical, no historical allocations inferred.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
