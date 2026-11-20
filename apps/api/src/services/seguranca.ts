import pool from '../config/db';
import bcrypt from 'bcryptjs';
import {createHash,createHmac,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import * as OTPAuth from 'otpauth';
import {EstoqueError} from './estoque-validacao';
import {emitirSessao} from './sessoes';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
export const hashToken=(v:string)=>createHash('sha256').update(v).digest('hex');
export const credencial=(u:any)=>createHmac('sha256',process.env.JWT_SECRET!).update(JSON.stringify([u.usuario_password,u.usuario_email,u.usuario_status,u.usuario_perfil_id,u.usuario_operar_estoque])).digest('hex');
export function chaveCripto(){const raw=process.env.AUTH_ENCRYPTION_KEY;if(!raw)return null;const key=Buffer.from(raw,'base64');if(key.length!==32||key.toString('base64')!==raw)throw new Error('AUTH_ENCRYPTION_KEY deve ser base64 de 32 bytes.');return key;}
export function cifrar(text:string){const key=chaveCripto();if(!key)throw new EstoqueError(503,'A autenticação adicional ainda não foi configurada.');const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([c.update(text,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64');}
export function decifrar(text:string){const key=chaveCripto();if(!key)throw new EstoqueError(503,'A chave de autenticação adicional não está disponível.');try{const b=Buffer.from(text,'base64'),c=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8');}catch{throw new EstoqueError(503,'Não foi possível validar a chave de autenticação adicional.');}}
export function limitar(tipo:string,identidade:string,limite:number,janela:number,now=Date.now()){
 const chave=createHmac('sha256',process.env.JWT_SECRET!).update(tipo+':'+identidade).digest('hex');
 const wait=pool.transaction(execute=>{
  execute('DELETE FROM pi2_auth_limites WHERE expira_em<=$1',[now]);const row=execute('SELECT * FROM pi2_auth_limites WHERE chave=$1',[chave]).rows[0];
  if(row&&row.tentativas>=limite)return Math.max(1,Math.ceil((row.expira_em-now)/1000));
  if(row)execute('UPDATE pi2_auth_limites SET tentativas=tentativas+1 WHERE chave=$1',[chave]);else execute('INSERT INTO pi2_auth_limites(chave,tentativas,expira_em) VALUES($1,1,$2)',[chave,now+janela]);return 0;
 });
 if(wait){const error=new EstoqueError(429,'Muitas tentativas. Aguarde antes de tentar novamente.') as EstoqueError&{retryAfter:number};error.retryAfter=wait;throw error;}return chave;
}
export function evento(execute:Execute,usuario:number,tipo:string){execute('INSERT INTO pi2_auth_eventos(usuario_id,tipo,data) VALUES($1,$2,$3)',[usuario,tipo,new Date().toISOString()]);}
export function invalidarTemporarios(execute:Execute,usuario:number){for(const table of ['pi2_auth_desafios','pi2_auth_reset','pi2_auth_outbox'])execute(`DELETE FROM ${table} WHERE usuario_id=$1`,[usuario]);execute('UPDATE pi2_auth_mfa SET pendente=NULL,pendente_ate=NULL WHERE usuario_id=$1',[usuario]);}
export function decidirEntrada(execute:Execute,u:any){
 const m=execute('SELECT ativo FROM pi2_auth_mfa WHERE usuario_id=$1',[u.usuario_id]).rows[0];
 if(!m?.ativo){evento(execute,u.usuario_id,'login');return emitirSessao(execute,u);}
 const raw=randomBytes(32).toString('hex'),exp=Date.now()+300000;
 execute('DELETE FROM pi2_auth_desafios WHERE expira_em<=$1 OR usuario_id=$2',[Date.now(),u.usuario_id]);
 execute('INSERT INTO pi2_auth_desafios(hash,usuario_id,expira_em,credencial) VALUES($1,$2,$3,$4)',[hashToken(raw),u.usuario_id,exp,credencial(u)]);
 return {mfa_required:true,desafio:raw,expira_em:Math.floor(exp/1000)};
}
function fator(execute:Execute,usuario:number,codigo:unknown,now=Date.now()){
 const m=execute('SELECT * FROM pi2_auth_mfa WHERE usuario_id=$1',[usuario]).rows[0];if(!m?.ativo)return false;
 if(typeof codigo!=='string'||codigo.length>80)return false;
 const token=codigo.trim().replace(/-/g,'').toUpperCase(),backup=hashToken(token),codes=JSON.parse(m.codigos) as string[];
 if(codes.includes(backup)){execute('UPDATE pi2_auth_mfa SET codigos=$2 WHERE usuario_id=$1',[usuario,JSON.stringify(codes.filter(c=>c!==backup))]);evento(execute,usuario,'codigo_recuperacao_usado');return true;}
 if(!/^\d{6}$/.test(token))return false;
 const totp=new OTPAuth.TOTP({secret:OTPAuth.Secret.fromBase32(decifrar(m.segredo)),algorithm:'SHA1',digits:6,period:30});
 const delta=totp.validate({token,window:1,timestamp:now,afterCounter:m.ultimo_contador});
 if(delta===null)return false;execute('UPDATE pi2_auth_mfa SET ultimo_contador=$2 WHERE usuario_id=$1',[usuario,Math.floor(now/30000)+delta]);return true;
}
export function concluirEntrada(desafio:unknown,codigo:unknown,ip:string){
 limitar('mfa-ip',ip,30,900000);
 if(typeof desafio!=='string'||! /^[a-f0-9]{64}$/.test(desafio))throw new EstoqueError(401,'Desafio ou código inválido.');
 const result=pool.transaction(execute=>{
  const d=execute('SELECT * FROM pi2_auth_desafios WHERE hash=$1',[hashToken(desafio)]).rows[0];
  if(!d||d.expira_em<=Date.now()||d.tentativas>=5)return null;
  execute('UPDATE pi2_auth_desafios SET tentativas=tentativas+1 WHERE hash=$1',[d.hash]);
  const u=execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[d.usuario_id]).rows[0];
  if(!u?.usuario_status||credencial(u)!==d.credencial||!fator(execute,u.usuario_id,codigo))return null;
  execute('DELETE FROM pi2_auth_desafios WHERE usuario_id=$1',[u.usuario_id]);evento(execute,u.usuario_id,'login_mfa');return emitirSessao(execute,u,true);
 });
 if(!result)throw new EstoqueError(401,'Desafio ou código inválido. Solicite um novo login após cinco tentativas.');return result;
}
export function validarSenhaNova(value:unknown){if(typeof value!=='string'||value.length<12||Buffer.byteLength(value,'utf8')>72)throw new EstoqueError(400,'A senha deve ter ao menos 12 caracteres e no máximo 72 bytes.');return value;}
async function reautenticar(usuario:number,senha:unknown){
 limitar('reauth',String(usuario),8,900000);
 if(typeof senha!=='string'||!senha||senha.length>1024)throw new EstoqueError(400,'Informe sua senha atual.');
 const u=(await pool.query('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[usuario])).rows[0];
 if(!u?.usuario_status||!await bcrypt.compare(senha,u.usuario_password))throw new EstoqueError(400,'Senha atual inválida.');return u;
}
function atual(execute:Execute,u:any){const a=execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[u.usuario_id]).rows[0];if(!a?.usuario_status||credencial(a)!==credencial(u))throw new EstoqueError(409,'A conta foi alterada. Entre novamente.');return a;}
function codigos(){return Array.from({length:10},()=>randomBytes(16).toString('hex').toUpperCase());}
export function estadoSeguranca(usuario:number){return pool.transaction(execute=>{const m=execute('SELECT ativo,ativado_em,codigos FROM pi2_auth_mfa WHERE usuario_id=$1',[usuario]).rows[0];return {mfa_disponivel:!!chaveCripto(),mfa_ativo:!!m?.ativo,ativado_em:m?.ativado_em??null,codigos_restantes:m?JSON.parse(m.codigos).length:0,eventos:execute('SELECT id,tipo,data FROM pi2_auth_eventos WHERE usuario_id=$1 ORDER BY id DESC LIMIT 20',[usuario]).rows};});}
export async function prepararMfa(usuario:number,senha:unknown){
 const u=await reautenticar(usuario,senha);if(!chaveCripto())throw new EstoqueError(503,'Configure a chave de autenticação adicional antes de habilitar.');
 const secret=new OTPAuth.Secret({size:20}),totp=new OTPAuth.TOTP({issuer:'Controle de estoque',label:u.usuario_nome,secret,algorithm:'SHA1',digits:6,period:30});
 return pool.transaction(execute=>{atual(execute,u);if(execute('SELECT ativo FROM pi2_auth_mfa WHERE usuario_id=$1',[usuario]).rows[0]?.ativo)throw new EstoqueError(409,'Dois fatores já estão ativos.');
 execute('INSERT INTO pi2_auth_mfa(usuario_id,pendente,pendente_ate) VALUES($1,$2,$3) ON CONFLICT(usuario_id) DO UPDATE SET pendente=excluded.pendente,pendente_ate=excluded.pendente_ate',[usuario,cifrar(secret.base32),Date.now()+600000]);return {segredo:secret.base32,uri:totp.toString()};});
}
export function ativarMfa(usuario:number,codigo:unknown,sessao:string){
 limitar('ativar-mfa',String(usuario),5,600000);
 return pool.transaction(execute=>{
  const m=execute('SELECT * FROM pi2_auth_mfa WHERE usuario_id=$1',[usuario]).rows[0];if(!m||m.ativo||!m.pendente||m.pendente_ate<=Date.now())throw new EstoqueError(409,'Preparação expirada. Inicie novamente.');
  if(typeof codigo!=='string'||!/^\d{6}$/.test(codigo))throw new EstoqueError(400,'Informe o código de seis dígitos.');
  const t=new OTPAuth.TOTP({secret:OTPAuth.Secret.fromBase32(decifrar(m.pendente))}),now=Date.now(),delta=t.validate({token:codigo,window:1,timestamp:now});if(delta===null)throw new EstoqueError(400,'Código inválido.');
  const backup=codigos();execute('UPDATE pi2_auth_mfa SET ativo=1,segredo=pendente,pendente=NULL,pendente_ate=NULL,ultimo_contador=$2,codigos=$3,ativado_em=$4 WHERE usuario_id=$1',[usuario,Math.floor(now/30000)+delta,JSON.stringify(backup.map(hashToken)),new Date().toISOString()]);
  execute('DELETE FROM pi2_sessoes WHERE usuario_id=$1 AND sessao_id<>$2',[usuario,sessao]);execute('UPDATE pi2_sessoes SET mfa_verificada=1 WHERE sessao_id=$1',[sessao]);invalidarTemporarios(execute,usuario);evento(execute,usuario,'mfa_ativado');return {codigos:backup};
 });
}
export async function gerenciarMfa(usuario:number,senha:unknown,codigo:unknown,sessao:string,desativar=false){
 const u=await reautenticar(usuario,senha);
 return pool.transaction(execute=>{atual(execute,u);if(!fator(execute,usuario,codigo))throw new EstoqueError(400,'Código adicional inválido ou já utilizado.');
 const backup=desativar?[]:codigos();
 if(desativar)execute("UPDATE pi2_auth_mfa SET ativo=0,segredo=NULL,codigos='[]',ultimo_contador=-1 WHERE usuario_id=$1",[usuario]);else execute('UPDATE pi2_auth_mfa SET codigos=$2 WHERE usuario_id=$1',[usuario,JSON.stringify(backup.map(hashToken))]);
 execute('DELETE FROM pi2_sessoes WHERE usuario_id=$1 AND sessao_id<>$2',[usuario,sessao]);execute('UPDATE pi2_sessoes SET mfa_verificada=$2 WHERE sessao_id=$1',[sessao,desativar?0:1]);invalidarTemporarios(execute,usuario);evento(execute,usuario,desativar?'mfa_desativado':'codigos_renovados');return {codigos:backup};});
}
export async function alterarSenha(usuario:number,senha:unknown,nova:unknown,codigo:unknown){
 const password=validarSenhaNova(nova),u=await reautenticar(usuario,senha),hash=await bcrypt.hash(password,12);
 return pool.transaction(execute=>{atual(execute,u);const m=execute('SELECT ativo FROM pi2_auth_mfa WHERE usuario_id=$1',[usuario]).rows[0];if(m?.ativo&&!fator(execute,usuario,codigo))throw new EstoqueError(400,'Código adicional inválido ou já utilizado.');
 execute('UPDATE pi2_usuarios SET usuario_password=$2 WHERE usuario_id=$1',[usuario,hash]);execute('DELETE FROM pi2_sessoes WHERE usuario_id=$1',[usuario]);invalidarTemporarios(execute,usuario);evento(execute,usuario,'senha_alterada');return {message:'Senha atualizada. Entre novamente.'};});
}
