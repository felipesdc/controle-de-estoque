import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import pool from '../config/db';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
export function emitirSessao(execute:Execute,current:any,mfa=false){
 const now=Math.floor(Date.now()/1000),exp=now+7200,sessao=randomUUID();
 execute('DELETE FROM pi2_sessoes WHERE expira_em<=$1',[now]);
 const token=jwt.sign({usuario_id:current.usuario_id,usuario_perfil_id:current.usuario_perfil_id,usuario_operar_estoque:!!current.usuario_operar_estoque},process.env.JWT_SECRET!,{algorithm:'HS256',expiresIn:7200,jwtid:sessao});
 execute('INSERT INTO pi2_sessoes(sessao_id,usuario_id,expira_em,mfa_verificada) VALUES($1,$2,$3,$4)',[sessao,current.usuario_id,exp,mfa?1:0]);
 const {usuario_password,...usuario}=current;
 return {token,usuario,expira_em:exp};
}
