import pool from '../config/db';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import {randomBytes} from 'node:crypto';
import {EstoqueError} from './estoque-validacao';
import {chaveCripto,cifrar,decifrar,hashToken,credencial,limitar,validarSenhaNova,invalidarTemporarios,evento} from './seguranca';
export function configuracaoEmail(){
 if(process.env.AUTH_EMAIL_DISABLED==='1')return null;
 const host=process.env.SMTP_HOST,from=process.env.SMTP_FROM,publicUrl=process.env.PUBLIC_URL;
 if(!host||!from||!publicUrl||!chaveCripto())return null;
 try{const url=new URL(publicUrl);if((url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||/[\r\n]/.test(from))return null;
 const port=Number(process.env.SMTP_PORT||587);if(!Number.isInteger(port)||port<1||port>65535)return null;
 return {host,port,from,url:url.origin+url.pathname.replace(/\/$/,''),secure:process.env.SMTP_SECURE==='true'||port===465};
 }catch{return null;}
}
export function solicitarRecuperacao(email:unknown,ip:string){
 limitar('recuperacao-ip',ip,30,3600000);
 if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+$/.test(email.trim()))throw new EstoqueError(400,'Informe um e-mail válido.');
 const normalized=email.trim().toLowerCase();limitar('recuperacao-email',normalized,3,3600000);
 const config=configuracaoEmail();if(!config)throw new EstoqueError(503,'Recuperação por e-mail ainda não configurada. Solicite suporte ao administrador.');
 const raw=randomBytes(32).toString('hex'),hash=hashToken(raw),now=Date.now();
 pool.transaction(execute=>{
  execute('DELETE FROM pi2_auth_reset WHERE expira_em<=$1',[now]);execute('DELETE FROM pi2_auth_outbox WHERE expira_em<=$1',[now]);
  const found=execute('SELECT * FROM pi2_usuarios WHERE usuario_email=$1 COLLATE NOCASE AND usuario_status=1 LIMIT 2',[normalized]).rows;
  if(found.length!==1)return;const u=found[0];
  execute('DELETE FROM pi2_auth_reset WHERE usuario_id=$1',[u.usuario_id]);execute('DELETE FROM pi2_auth_outbox WHERE usuario_id=$1',[u.usuario_id]);
  execute('INSERT INTO pi2_auth_reset(hash,usuario_id,expira_em,credencial) VALUES($1,$2,$3,$4)',[hash,u.usuario_id,now+900000,credencial(u)]);
  const payload=cifrar(JSON.stringify({to:u.usuario_email,url:config.url+'/redefinir-senha#token='+raw}));
  execute('INSERT INTO pi2_auth_outbox(usuario_id,payload,proxima_em,expira_em) VALUES($1,$2,$3,$4)',[u.usuario_id,payload,now,now+900000]);evento(execute,u.usuario_id,'recuperacao_solicitada');
 });
 return {message:'Se o e-mail corresponder a uma conta ativa, as instruções serão enviadas. O link expira em 15 minutos.'};
}
export async function redefinirSenha(token:unknown,nova:unknown,ip:string){
 limitar('redefinir-ip',ip,20,900000);const senha=validarSenhaNova(nova);
 if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw new EstoqueError(400,'Link inválido ou expirado.');
 // Hash only after a cheap token lookup, then revalidate atomically before consuming it.
 const row=(await pool.query('SELECT * FROM pi2_auth_reset WHERE hash=$1 AND expira_em>$2',[hashToken(token),Date.now()])).rows[0];
 if(!row)throw new EstoqueError(400,'Link inválido ou expirado.');
 const hash=await bcrypt.hash(senha,12);
 return pool.transaction(execute=>{
  const current=execute('SELECT * FROM pi2_auth_reset WHERE hash=$1 AND expira_em>$2',[hashToken(token),Date.now()]).rows[0],u=current?execute('SELECT * FROM pi2_usuarios WHERE usuario_id=$1',[current.usuario_id]).rows[0]:null;
  if(!current||!u?.usuario_status||current.credencial!==credencial(u))throw new EstoqueError(400,'Link inválido ou expirado.');
  execute('UPDATE pi2_usuarios SET usuario_password=$2 WHERE usuario_id=$1',[u.usuario_id,hash]);execute('DELETE FROM pi2_sessoes WHERE usuario_id=$1',[u.usuario_id]);invalidarTemporarios(execute,u.usuario_id);evento(execute,u.usuario_id,'senha_recuperada');
  return {message:'Senha atualizada. Entre novamente. A autenticação em dois fatores, se ativa, continua obrigatória.'};
 });
}
let processando=false;
export async function processarEmails(send?:(message:{to:string;url:string})=>Promise<void>){
 if(processando)return;const config=configuracaoEmail();if(!config)return;processando=true;
 try{
  const pending=(await pool.query('SELECT * FROM pi2_auth_outbox WHERE proxima_em<=$1 AND expira_em>$1 ORDER BY id LIMIT 5',[Date.now()])).rows;
  const transport=send?null:nodemailer.createTransport({host:config.host,port:config.port,secure:config.secure,requireTLS:!config.secure,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000,disableFileAccess:true,disableUrlAccess:true});
  for(const row of pending){
   try{const data=JSON.parse(decifrar(row.payload));if(send)await send(data);else await transport!.sendMail({from:config.from,to:data.to,subject:'Redefinição de senha — Controle de estoque',text:'Foi solicitada a redefinição da sua senha. O link expira em 15 minutos e só pode ser usado uma vez.\n\n'+data.url+'\n\nSe você não solicitou, ignore esta mensagem. Seus fatores adicionais continuam ativos.'});await pool.query('DELETE FROM pi2_auth_outbox WHERE id=$1',[row.id]);}
   catch{if(row.tentativas>=2)await pool.query('DELETE FROM pi2_auth_outbox WHERE id=$1',[row.id]);else await pool.query('UPDATE pi2_auth_outbox SET tentativas=tentativas+1,proxima_em=$2 WHERE id=$1',[row.id,Date.now()+60000]);console.error('Falha no envio de recuperação; conteúdo e destinatário omitidos.');}
  }
  await pool.query('DELETE FROM pi2_auth_outbox WHERE expira_em<=$1',[Date.now()]);await pool.query('DELETE FROM pi2_auth_reset WHERE expira_em<=$1',[Date.now()]);
 }finally{processando=false;}
}
export function iniciarEnvio(){if(configuracaoEmail()){const timer=setInterval(()=>{void processarEmails().catch(()=>console.error('Falha na fila de recuperação.'));},5000);timer.unref();}}
