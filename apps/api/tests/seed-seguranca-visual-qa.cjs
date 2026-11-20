if(process.env.SQLITE_PATH!=='/data/dashboard-qa.sqlite'||process.env.ADMIN_EMAIL!=='qa@dashboard.local')throw Error('Somente base descartável de QA');
const pool=require('/app/dist/config/db').default;const {salvarUsuario,entrar}=require('/app/dist/services/acessos');const security=require('/app/dist/services/seguranca');const OTP=require('/app/node_modules/otpauth'),jwt=require('/app/node_modules/jsonwebtoken');
(async()=>{
 if((await pool.query("SELECT usuario_id FROM pi2_usuarios WHERE usuario_nome='mfa_visual'")).rows.length)return;
 const user=salvarUsuario({usuario_nome:'mfa_visual',usuario_email:'mfa@visual.qa.local',usuario_nome_completo:'Funcionário MFA visual',usuario_password:'mfa-visual-only-2026',usuario_perfil_id:3,usuario_operar_estoque:true},1);
 const login=await entrar('mfa_visual','mfa-visual-only-2026','visual-fixture');const setup=await security.prepararMfa(user.usuario_id,'mfa-visual-only-2026');const totp=new OTP.TOTP({secret:OTP.Secret.fromBase32(setup.segredo)});security.ativarMfa(user.usuario_id,totp.generate({timestamp:Date.now()-30000}),jwt.decode(login.token).jti);
 console.log('PASS: funcionário sintético mfa_visual com segundo fator preparado apenas em QA.');
})().catch(e=>{console.error(e);process.exitCode=1});
