'use strict';
const {DatabaseSync,backup}=require('node:sqlite');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {spawn}=require('node:child_process');
const quote=s=>'"'+s.replace(/"/g,'""')+'"';
const hashFile=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const core={pi2_usuarios:['usuario_id','usuario_nome','usuario_password','usuario_status'],pi2_produtos:['produto_id','produto_quantidade_estoque'],pi2_pedidos:['pedido_id','pedido_total','pedido_estado_id'],pi2_movimentos_estoque:['movimento_id','movimento_produto_id','movimento_quantidade','movimento_tipo'],pi2_itens_pedido:['item_pedido_id','item_pedido_pedido_id','item_pedido_quantidade']};
function tableDigest(db,table,columns){const h=crypto.createHash('sha256');let count=0;for(const row of db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY ${columns.map(quote).join(',')}`).iterate()){h.update(JSON.stringify(row)+'\n');count++;}return{count,sha256:h.digest('hex')};}
function inspect(db){
 const integrity=db.prepare('PRAGMA integrity_check').all();if(integrity.length!==1||Object.values(integrity[0])[0]!=='ok')throw Error('Falha no integrity_check do SQLite.');
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('O banco contém vínculos inválidos (foreign_key_check).');
 const tables={};for(const {name}of db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()){const columns=db.prepare(`PRAGMA table_info(${quote(name)})`).all().map(c=>c.name);tables[name]={columns,...tableDigest(db,name,columns)};}
 for(const name of Object.keys(core))if(!tables[name])throw Error('Backup não é uma base reconhecida do controle de estoque.');
 const critical={};for(const [name,columns]of Object.entries(core))critical[name]=tableDigest(db,name,columns);
 return{schema_version:db.prepare('PRAGMA user_version').get().user_version,schema_sha256:crypto.createHash('sha256').update(JSON.stringify(db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all())).digest('hex'),tables,critical};
}
function syncFile(filename){const fd=fs.openSync(filename,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function load(dir){
 const meta=JSON.parse(fs.readFileSync(path.join(dir,'manifesto.json'),'utf8'));
 if(meta.format!==1||meta.database!=='estoque.sqlite'||typeof meta.sha256!=='string'||!meta.snapshot)throw Error('Manifesto de backup inválido.');
 const file=path.join(dir,'estoque.sqlite');
 if(!fs.lstatSync(file).isFile()||hashFile(file)!==meta.sha256)throw Error('Checksum do backup não confere.');
 // A WAL-format database may need temporary SHM files even for read-only queries.
 // Inspect a private copy; never ask SQLite to create sidecars on the backup mount.
 const tmp=fs.mkdtempSync('/tmp/estoque-inspect-');
 try{const copy=path.join(tmp,'estoque.sqlite');fs.copyFileSync(file,copy,fs.constants.COPYFILE_EXCL);const db=new DatabaseSync(copy,{readOnly:true});try{if(JSON.stringify(inspect(db))!==JSON.stringify(meta.snapshot))throw Error('Conteúdo do backup não corresponde ao manifesto.');}finally{db.close();}}finally{fs.rmSync(tmp,{recursive:true,force:true});}
 return{meta,file};
}
async function create(source,dir){
 if(!source||source===':memory:'||!fs.statSync(source).isFile())throw Error('Arquivo SQLite de origem não encontrado.');
 fs.mkdirSync(dir,{mode:0o700});const target=path.join(dir,'estoque.sqlite');
 const db=new DatabaseSync(source,{readOnly:true,timeout:15000});try{await backup(db,target);}finally{db.close();}
 fs.chmodSync(target,0o600);const copy=new DatabaseSync(target,{readOnly:true});let snapshot;try{snapshot=inspect(copy);}finally{copy.close();}
 const meta={format:1,database:'estoque.sqlite',created_at:new Date().toISOString(),source_image:process.env.BACKUP_IMAGE_ID||null,node:process.version,sha256:hashFile(target),snapshot};
 fs.writeFileSync(path.join(dir,'manifesto.json'),JSON.stringify(meta,null,2)+'\n',{mode:0o600,flag:'wx'});syncFile(target);syncFile(path.join(dir,'manifesto.json'));syncFile(dir);console.log(JSON.stringify({created_at:meta.created_at,schema_version:snapshot.schema_version,tables:Object.keys(snapshot.tables).length}));
}
async function smoke(file,expected){
 const secret=crypto.randomBytes(32).toString('hex'),port='3199';
 const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,SQLITE_PATH:file,JWT_SECRET:secret,ADMIN_PASSWORD:crypto.randomBytes(24).toString('hex'),PORT:port},stdio:['ignore','ignore','pipe']});let failure='';child.stderr.on('data',b=>{failure+=String(b).slice(0,1000);});
 try{
  let ready=false;for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('API restaurada não iniciou.');try{const r=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('API restaurada não ficou saudável no prazo.');
  const db=new DatabaseSync(file);let user;let sid=crypto.randomUUID();
  try{
   for(const [name,columns]of Object.entries(core))if(JSON.stringify(tableDigest(db,name,columns))!==JSON.stringify(expected.critical[name]))throw Error('Dados essenciais mudaram ao iniciar a cópia restaurada.');
   user=db.prepare('SELECT usuario_id FROM pi2_usuarios WHERE usuario_status=1 AND usuario_perfil_id=1 LIMIT 1').get();
   if(!user)throw Error('A cópia não contém administrador ativo para validar acesso.');
   db.prepare('INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em) VALUES(?,?,?)').run(sid,user.usuario_id,Math.floor(Date.now()/1000)+60);
   const jwt=require('jsonwebtoken');const token=jwt.sign({usuario_id:user.usuario_id,usuario_perfil_id:1},secret,{expiresIn:60,jwtid:sid});
   for(const route of ['/v1/dashboard','/v1/compras/pedidos','/v1/acessos/usuarios','/v1/movimentacao-estoque/historico']){const r=await fetch(`http://127.0.0.1:${port}${route}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error('Falha ao consultar os dados pela API restaurada.');await r.json();}
  }finally{db.prepare('DELETE FROM pi2_sessoes WHERE sessao_id=?').run(sid);db.close();}
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode)resolve();else{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},2000).unref();}});}
}
async function verify(dir){const {meta,file}=load(dir);const tmp=fs.mkdtempSync('/tmp/estoque-restore-check-');try{const restored=path.join(tmp,'estoque.sqlite');fs.copyFileSync(file,restored,fs.constants.COPYFILE_EXCL);const db=new DatabaseSync(restored,{readOnly:true});try{if(JSON.stringify(inspect(db))!==JSON.stringify(meta.snapshot))throw Error('Cópia restaurada diverge do backup.');}finally{db.close();}await smoke(restored,meta.snapshot);console.log(JSON.stringify({status:'ok',created_at:meta.created_at,schema_version:meta.snapshot.schema_version,checks:['sha256','integrity_check','foreign_key_check','all_tables','credentials','balances','orders','history','api_health','authenticated_api']}));}finally{fs.rmSync(tmp,{recursive:true,force:true});}}
function install(dir,target){
 if(process.env.RESTORE_STOPPED_API!=='1'||!/^\/data\/[^/]+\.sqlite$/.test(target))throw Error('Restauração exige API parada e destino SQLite em /data.');
 const {file}=load(dir);const rollback=fs.mkdtempSync('/data/.restore-rollback-');fs.chmodSync(rollback,0o700);const staged=path.join(rollback,'novo.sqlite');fs.copyFileSync(file,staged,fs.constants.COPYFILE_EXCL);fs.chmodSync(staged,0o600);if(process.getuid()===0)fs.chownSync(staged,1000,1000);
 const db=new DatabaseSync(staged);try{const hasSessions=db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='pi2_sessoes'").get();if(hasSessions)db.exec('DELETE FROM pi2_sessoes; PRAGMA wal_checkpoint(TRUNCATE);');}finally{db.close();}syncFile(staged);
 fs.writeFileSync(path.join(rollback,'destino.txt'),target,{mode:0o600});
 // Consolidate the stopped database before replacing its main file atomically.
 // Until rename succeeds, the original main file remains in place and complete.
 const current=new DatabaseSync(target,{timeout:15000});
 try{const checkpoint=current.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();if(checkpoint.busy)throw Error('Banco ainda está em uso; restauração cancelada.');}finally{current.close();}
 syncFile(target);
 fs.copyFileSync(target,path.join(rollback,'anterior.sqlite'),fs.constants.COPYFILE_EXCL);if(process.getuid()===0)fs.chownSync(path.join(rollback,'anterior.sqlite'),1000,1000);
 syncFile(path.join(rollback,'anterior.sqlite'));
 try{for(const suffix of ['-wal','-shm'])if(fs.existsSync(target+suffix))fs.renameSync(target+suffix,path.join(rollback,'anterior.sqlite'+suffix));fs.renameSync(staged,target);}catch(e){for(const suffix of ['-wal','-shm']){const old=path.join(rollback,'anterior.sqlite'+suffix);if(fs.existsSync(old))fs.renameSync(old,target+suffix);}throw e;}

 syncFile(rollback);syncFile(path.dirname(target));console.log(rollback);
}
function rollback(dir,target){if(process.env.RESTORE_STOPPED_API!=='1'||!/^\/data\/\.restore-rollback-[\w-]+$/.test(dir)||fs.readFileSync(path.join(dir,'destino.txt'),'utf8')!==target)throw Error('Rollback inválido.');if(!fs.existsSync(path.join(dir,'anterior.sqlite')))throw Error('Banco anterior indisponível.');for(const suffix of ['','-wal','-shm']){if(fs.existsSync(target+suffix))fs.renameSync(target+suffix,path.join(dir,'falhou.sqlite'+suffix));const old=path.join(dir,'anterior.sqlite'+suffix);if(fs.existsSync(old))fs.renameSync(old,target+suffix);}console.log('Banco anterior recolocado.');}
function lock(){const dir='/data/.restore-lock';try{fs.mkdirSync(dir,{mode:0o700});}catch(e){if(e.code==='EEXIST')throw Error('Outra restauração está em andamento ou deixou um bloqueio em /data/.restore-lock.');throw e;}const token=crypto.randomUUID();fs.writeFileSync(path.join(dir,'token'),token,{mode:0o600,flag:'wx'});console.log(token);}
function unlock(token){const dir='/data/.restore-lock';if(!token||fs.readFileSync(path.join(dir,'token'),'utf8')!==token)throw Error('Bloqueio de restauração pertence a outra operação.');fs.unlinkSync(path.join(dir,'token'));fs.rmdirSync(dir);}
if(require.main===module){const [action,...args]=process.argv.slice(2);Promise.resolve().then(()=>{if(action==='lock')return lock();if(action==='unlock')return unlock(args[0]);if(action==='create')return create(args[0],args[1]);if(action==='verify')return verify(args[0]);if(action==='install')return install(args[0],args[1]);if(action==='rollback')return rollback(args[0],args[1]);throw Error('Use create, verify, install ou rollback.');}).catch(e=>{console.error('Falha: '+e.message);process.exitCode=1;});}
module.exports={create,load,inspect,verify};
