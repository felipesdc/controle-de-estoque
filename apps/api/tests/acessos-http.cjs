const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const jwt=require('/app/node_modules/jsonwebtoken');const {randomUUID}=require('node:crypto');
const child=spawn(process.execPath,['/app/dist/app.js'],{env:{...process.env,PORT:'3105',SQLITE_PATH:':memory:'},stdio:['ignore','ignore','inherit']});
(async()=>{
 const base='http://127.0.0.1:3105/v1';for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3105/health')).ok)break;}catch{}if(i===99)throw new Error('API did not start');await new Promise(r=>setTimeout(r,100));}
 let token;async function req(path,method='GET',body,auth=token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:r.status===204?null:await r.json()};}
 async function login(nome,password){return req('/usuario/login','POST',{usuario_login:nome,usuario_password:password},'');}
 const a=await login('admin',process.env.ADMIN_PASSWORD);assert.equal(a.status,200);token=a.data.token;assert.equal(a.data.usuario.usuario_password,undefined);
 const b=await login('admin',process.env.ADMIN_PASSWORD);const secondSession=b.data.token;
 assert.equal((await req('/sessao')).status,200);
 assert.equal((await req('/perfil')).data.length,3);
 assert.equal((await req('/perfil/1','DELETE')).status,409);
 assert.equal((await req('/perfil/2','PUT',{perfil_nome:'Outro'})).status,409);
 assert.equal((await req('/acessos/usuarios/1','PATCH',{usuario_status:false})).status,409);
 assert.equal((await req('/usuario/1','DELETE')).status,409);
 assert.equal((await req('/usuario/1','PUT',{usuario_perfil_id:2})).status,409);
 for(const body of [{usuario_nome:'ab',usuario_password:'password-test-123'},{usuario_nome:'teste',usuario_password:'short'},{usuario_nome:'teste',usuario_password:'á'.repeat(40)},{usuario_nome:'teste',usuario_password:'password-test-123',usuario_perfil_id:999}]){
  const r=await req('/acessos/usuarios','POST',{usuario_email:'teste@local',usuario_nome_completo:'Pessoa Teste',...body});assert.equal(r.status,400,JSON.stringify(r));
 }
 const created=await req('/acessos/usuarios','POST',{usuario_nome:'operador',usuario_email:' OPERADOR@LOCAL ',usuario_nome_completo:'Pessoa de consulta',usuario_password:'password-test-123'});assert.equal(created.status,201,JSON.stringify(created));const id=created.data.usuario_id;assert.equal(created.data.usuario_email,'operador@local');assert.equal(created.data.usuario_password,undefined);
 assert.equal((await req('/acessos/usuarios','POST',{usuario_nome:'OPERADOR',usuario_email:'outro@local',usuario_nome_completo:'Outro',usuario_password:'password-test-123'})).status,409);
 const custom=await req('/perfil','POST',{perfil_nome:'Auditoria',nivel:'Administrador'});assert.equal(custom.status,201);const perfilId=custom.data.perfil_id;assert.ok(perfilId>3);assert.equal((await req('/perfil')).data.find(p=>p.perfil_id===perfilId).nivel,'Consulta');
 assert.equal((await req(`/acessos/usuarios/${id}`,'PATCH',{usuario_perfil_id:perfilId})).status,200);
 assert.equal((await req(`/perfil/${perfilId}`,'DELETE')).status,409);
 const op=(await login('operador','password-test-123')).data.token;const op2=(await login('operador','password-test-123')).data.token;
 assert.equal((await req('/sessao','GET',undefined,op)).status,200);
 assert.equal((await req('/acessos/usuarios','GET',undefined,op)).status,403);
 assert.equal((await req(`/acessos/usuarios/${id}`,'PATCH',{usuario_password:'new-password-1234'})).status,200);
 assert.equal((await req('/sessao','GET',undefined,op)).status,401);assert.equal((await req('/sessao','GET',undefined,op2)).status,401);
 assert.equal((await login('operador','password-test-123')).status,401);const updated=(await login('operador','new-password-1234')).data.token;assert.ok(updated);
 assert.equal((await req(`/acessos/usuarios/${id}`,'PATCH',{usuario_perfil_id:2})).status,200);assert.equal((await req('/sessao','GET',undefined,updated)).status,401);
 const manager=(await login('operador','new-password-1234')).data.token;assert.equal((await req('/categoria','POST',{categoria_descricao:'Criada por gerente'},manager)).status,201);assert.equal((await req('/acessos/usuarios','GET',undefined,manager)).status,403);
 assert.equal((await req(`/usuario/${id}`,'DELETE')).status,204);assert.equal((await login('operador','new-password-1234')).status,401);assert.equal((await req('/sessao','GET',undefined,manager)).status,401);
 assert.equal((await req(`/acessos/usuarios/${id}`,'PATCH',{usuario_status:true})).status,200);
 assert.equal((await req('/sessao/sair','POST',{},token)).status,204);assert.equal((await req('/sessao','GET',undefined,token)).status,401);token=secondSession;assert.equal((await req('/sessao')).status,200,'logging out one session preserves another');
 const expired=jwt.sign({usuario_id:1,usuario_perfil_id:1,exp:Math.floor(Date.now()/1000)-5},process.env.JWT_SECRET,{jwtid:randomUUID()});assert.equal((await req('/sessao','GET',undefined,expired)).status,401);
 const legacy=jwt.sign({usuario_id:1,usuario_perfil_id:1},process.env.JWT_SECRET,{expiresIn:'2h'});assert.equal((await req('/sessao','GET',undefined,legacy)).status,401);
 const noSession=jwt.sign({usuario_id:1,usuario_perfil_id:1},process.env.JWT_SECRET,{expiresIn:'2h',jwtid:randomUUID()});assert.equal((await req('/sessao','GET',undefined,noSession)).status,401);
 const other=await req('/acessos/usuarios','POST',{usuario_nome:'outro_admin',usuario_email:'admin2@local',usuario_nome_completo:'Administrador adicional',usuario_password:'another-admin-123',usuario_perfil_id:1});assert.equal(other.status,201);const otherId=other.data.usuario_id;
 const otherToken=(await login('outro_admin','another-admin-123')).data.token;
 const raced=await Promise.all([req(`/acessos/usuarios/${otherId}`,'PATCH',{usuario_perfil_id:3},token),req('/acessos/usuarios/1','PATCH',{usuario_perfil_id:3},otherToken)]);
 assert.equal(raced.filter(r=>r.status===200).length,1,JSON.stringify(raced));assert.ok(raced.some(r=>[401,403].includes(r.status)));
 const candidates=[token,otherToken];let winner;
 for(const t of candidates){const s=await req('/sessao','GET',undefined,t);if(s.status===200&&s.data.usuario.usuario_perfil_id===1)winner={token:t,user:s.data.usuario};}
 assert.ok(winner);token=winner.token;
 const all=(await req('/usuario')).data;assert.ok(all.every(u=>u.usuario_password===undefined));assert.equal(all.filter(u=>u.usuario_status&&u.usuario_perfil_id===1).length,1);
 assert.equal((await req(`/acessos/usuarios/${winner.user.usuario_id}`,'PATCH',{usuario_password:'final-admin-pass-123'})).status,200);assert.equal((await req('/sessao')).status,401);assert.equal((await login(winner.user.usuario_nome,'final-admin-pass-123')).status,200);
 console.log('PASS: system profiles, validation, last-admin/self protection, paginated private users, logout revocation, multiple sessions, password/role/status invalidation, expired/legacy tokens, concurrent administrator changes and hash redaction.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>child.kill());
