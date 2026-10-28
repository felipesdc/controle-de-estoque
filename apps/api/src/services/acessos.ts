import pool from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { EstoqueError } from "./estoque";
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const id=(value:unknown)=>{if((typeof value!=="number"&&(typeof value!=="string"||!/^\d+$/.test(value)))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw new EstoqueError(400,"Identificador inválido.");return Number(value);};
const dummyHash=bcrypt.hashSync(randomUUID(),12);
const key=(value:unknown)=>String(value??'').trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
export const nivel=(perfil:number)=>perfil===1?'Administrador':perfil===2?'Gerente':'Consulta';
const publicUser=(row:any)=>{const {usuario_password,...user}=row;return user;};
const usersSql=`SELECT u.*,p.perfil_nome AS usuario_perfil_nome FROM pi2_usuarios u LEFT JOIN pi2_perfis p ON p.perfil_id=u.usuario_perfil_id`;
function actor(execute:Execute,userId:number){const u=execute('SELECT usuario_status,usuario_perfil_id FROM pi2_usuarios WHERE usuario_id=$1',[userId]).rows[0];if(!u?.usuario_status||u.usuario_perfil_id!==1)throw new EstoqueError(403,'Acesso restrito ao administrador ativo.');}
function get(execute:Execute,userId:number){const row=execute(usersSql+' WHERE u.usuario_id=$1',[userId]).rows[0];if(!row)throw new EstoqueError(404,'Usuário não encontrado.');return row;}
export function usuarios(value?:unknown){return pool.transaction(execute=>value===undefined?execute(usersSql+' ORDER BY u.usuario_nome COLLATE NOCASE,u.usuario_id').rows.map(publicUser):publicUser(get(execute,id(value))));}
export function perfis(){return pool.transaction(execute=>execute(`SELECT p.*, (SELECT COUNT(*) FROM pi2_usuarios u WHERE u.usuario_perfil_id=p.perfil_id) AS usuarios FROM pi2_perfis p ORDER BY perfil_id`).rows.map(p=>({...p,nivel:nivel(p.perfil_id),protegido:p.perfil_id<=3})));}
export function listarUsuarios(params:Record<string,unknown>){
  const text=(k:string,f='')=>{const v=params[k]??f;if(typeof v!=='string')throw new EstoqueError(400,'Filtro inválido.');return v.trim();};
  const q=text('q');if(q.length>100)throw new EstoqueError(400,'Busca deve ter até 100 caracteres.');
  const estado=text('estado','todos');if(!['todos','ativos','inativos'].includes(estado))throw new EstoqueError(400,'Situação inválida.');
  const pagina=id(text('pagina','1')),tamanho=id(text('tamanho','10'));if(![10,25,50].includes(tamanho))throw new EstoqueError(400,'Tamanho deve ser 10, 25 ou 50.');
  const filtro=text('perfil');const values:unknown[]=[];const conditions:string[]=[];
  const bind=(v:unknown)=>{values.push(v);return `$${values.length}`;};
  if(q){const term=bind('%'+q.replace(/[\\%_]/g,'\\$&')+'%');conditions.push(`(u.usuario_nome LIKE ${term} ESCAPE '\\' OR u.usuario_nome_completo LIKE ${term} ESCAPE '\\' OR u.usuario_email LIKE ${term} ESCAPE '\\')`);}
  if(estado!=='todos')conditions.push(`u.usuario_status=${bind(estado==='ativos')}`);
  if(filtro)conditions.push(`u.usuario_perfil_id=${bind(id(filtro))}`);
  const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
  return pool.transaction(execute=>{const total=execute(`SELECT COUNT(*) AS total FROM pi2_usuarios u${where}`,values).rows[0].total;const atual=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));const rows=execute(`${usersSql}${where} ORDER BY u.usuario_nome COLLATE NOCASE,u.usuario_id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,tamanho,(atual-1)*tamanho]).rows;return{itens:rows.map(publicUser),total,pagina:atual,tamanho};});
}
export function salvarUsuario(body:unknown,actorId:number,value?:unknown,legado=false){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new EstoqueError(400,'Dados do usuário inválidos.');
  const userId=value===undefined?undefined:id(value);const allowed=['usuario_nome','usuario_email','usuario_nome_completo','usuario_password','usuario_perfil_id','usuario_status'];
  const data:Record<string,any>={};
  for(const [field,val] of Object.entries(body)){if(!allowed.includes(field)){if(legado)continue;throw new EstoqueError(400,'Campo de usuário não permitido.');}data[field]=val;}
  for(const field of ['usuario_nome','usuario_email','usuario_nome_completo']){
    if(data[field]===undefined){if(!userId)throw new EstoqueError(400,'Informe usuário, e-mail e nome completo.');continue;}
    if(typeof data[field]!=='string'||!data[field].trim())throw new EstoqueError(400,'Informe usuário, e-mail e nome completo válidos.');
    data[field]=data[field].trim();
  }
  if(data.usuario_nome!==undefined&&!/^[A-Za-z0-9._-]{3,50}$/.test(data.usuario_nome))throw new EstoqueError(400,'Usuário deve ter de 3 a 50 letras, números, ponto, hífen ou sublinhado.');
  if(data.usuario_email!==undefined){data.usuario_email=data.usuario_email.toLowerCase();if(data.usuario_email.length>254||!/^[^\s@]+@[^\s@]+$/.test(data.usuario_email))throw new EstoqueError(400,'Informe um e-mail válido.');}
  if(data.usuario_nome_completo?.length>200)throw new EstoqueError(400,'Nome completo deve ter até 200 caracteres.');
  if(data.usuario_status!==undefined&&typeof data.usuario_status!=='boolean')throw new EstoqueError(400,'Situação deve ser verdadeira ou falsa.');
  if(data.usuario_perfil_id!==undefined)data.usuario_perfil_id=id(data.usuario_perfil_id);
  if(!userId){data.usuario_status??=true;data.usuario_perfil_id??=3;}
  let hash:string|undefined;
  if(data.usuario_password!==undefined&&data.usuario_password!==''){
    if(typeof data.usuario_password!=='string'||data.usuario_password.length<12||Buffer.byteLength(data.usuario_password,'utf8')>72)throw new EstoqueError(400,'A senha deve ter ao menos 12 caracteres e no máximo 72 bytes.');
    hash=bcrypt.hashSync(data.usuario_password,12);
  }else if(!userId)throw new EstoqueError(400,'Informe a senha inicial.');
  delete data.usuario_password;
  if(hash)data.usuario_password=hash;
  if(!Object.keys(data).length)throw new EstoqueError(400,'Informe dados para atualizar.');
  return pool.transaction(execute=>{
    actor(execute,actorId);const current=userId?get(execute,userId):null;
    const perfil=data.usuario_perfil_id??current?.usuario_perfil_id;
    if(!execute('SELECT 1 FROM pi2_perfis WHERE perfil_id=$1',[perfil]).rows.length)throw new EstoqueError(400,'Perfil não encontrado.');
    const ativo=data.usuario_status??current?.usuario_status;
    if(current?.usuario_perfil_id===1&&current.usuario_status&&(!ativo||perfil!==1)){
      if(userId===actorId)throw new EstoqueError(409,'Você não pode desativar nem remover o próprio acesso administrativo.');
      if(execute('SELECT COUNT(*) AS total FROM pi2_usuarios WHERE usuario_perfil_id=1 AND usuario_status=1').rows[0].total<=1)throw new EstoqueError(409,'O sistema deve manter ao menos um administrador ativo.');
    }
    const rows=execute('SELECT usuario_id,usuario_nome,usuario_email FROM pi2_usuarios').rows;
    if(rows.some(u=>u.usuario_id!==userId&&((data.usuario_nome!==undefined&&key(u.usuario_nome)===key(data.usuario_nome))||(data.usuario_email!==undefined&&key(u.usuario_email)===key(data.usuario_email)))))throw new EstoqueError(409,'Usuário ou e-mail já cadastrado.');
    let target=userId;
    if(!target){data.usuario_inscricao=new Date().toISOString();const keys=Object.keys(data);target=execute(`INSERT INTO pi2_usuarios (${keys.join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')}) RETURNING usuario_id`,Object.values(data)).rows[0].usuario_id;}
    else{const keys=Object.keys(data);execute(`UPDATE pi2_usuarios SET ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} WHERE usuario_id=$1`,[target,...Object.values(data)]);if(hash||perfil!==current.usuario_perfil_id||ativo!==current.usuario_status)execute('DELETE FROM pi2_sessoes WHERE usuario_id=$1',[target]);}
    return publicUser(get(execute,target!));
  });
}
export function desativarUsuario(value:unknown,actorId:number){salvarUsuario({usuario_status:false},actorId,value);}
export function salvarPerfil(body:any,actorId:number,value?:unknown){
  const perfilId=value===undefined?undefined:id(value);const name=body?.perfil_nome;
  if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw new EstoqueError(400,'Informe um nome de perfil de até 80 caracteres.');
  return pool.transaction(execute=>{actor(execute,actorId);if(perfilId&&perfilId<=3)throw new EstoqueError(409,'Os perfis básicos são fixos e não podem ser alterados.');
    if(perfilId&&!execute('SELECT 1 FROM pi2_perfis WHERE perfil_id=$1',[perfilId]).rows.length)throw new EstoqueError(404,'Perfil não encontrado.');
    if(execute('SELECT * FROM pi2_perfis').rows.some(p=>p.perfil_id!==perfilId&&key(p.perfil_nome)===key(name)))throw new EstoqueError(409,'Já existe um perfil com este nome.');
    return perfilId?execute('UPDATE pi2_perfis SET perfil_nome=$2 WHERE perfil_id=$1 RETURNING *',[perfilId,name.trim()]).rows[0]:execute('INSERT INTO pi2_perfis (perfil_nome) VALUES ($1) RETURNING *',[name.trim()]).rows[0];});
}
export function excluirPerfil(value:unknown,actorId:number){const perfilId=id(value);pool.transaction(execute=>{actor(execute,actorId);if(perfilId<=3)throw new EstoqueError(409,'Os perfis básicos não podem ser excluídos.');if(!execute('SELECT 1 FROM pi2_perfis WHERE perfil_id=$1',[perfilId]).rows.length)throw new EstoqueError(404,'Perfil não encontrado.');if(execute('SELECT 1 FROM pi2_usuarios WHERE usuario_perfil_id=$1 LIMIT 1',[perfilId]).rows.length)throw new EstoqueError(409,'Este perfil está associado a usuários, inclusive inativos.');execute('DELETE FROM pi2_perfis WHERE perfil_id=$1',[perfilId]);});}
export async function entrar(login:unknown,password:unknown){
  if(typeof login!=='string'||!login.trim()||login.length>254||typeof password!=='string'||!password||password.length>1024)throw new EstoqueError(400,'Informe usuário e senha.');
  const found=(await pool.query('SELECT * FROM pi2_usuarios WHERE usuario_nome=$1 COLLATE NOCASE OR usuario_email=$1 COLLATE NOCASE LIMIT 2',[login.trim()])).rows;
  const user=found.length===1?found[0]:null;
  const matches=await bcrypt.compare(password,user?.usuario_password||dummyHash);
  if(!user||!matches||!user.usuario_status)throw new EstoqueError(401,'Usuário ou senha inválidos.');
  return pool.transaction(execute=>{const current=get(execute,user.usuario_id);if(!current.usuario_status||current.usuario_password!==user.usuario_password)throw new EstoqueError(401,'Usuário ou senha inválidos.');const now=Math.floor(Date.now()/1000),exp=now+7200,sessao=randomUUID();
    execute('DELETE FROM pi2_sessoes WHERE expira_em <= $1',[now]);
    const token=jwt.sign({usuario_id:current.usuario_id,usuario_perfil_id:current.usuario_perfil_id},process.env.JWT_SECRET!,{expiresIn:7200,jwtid:sessao});
    execute('INSERT INTO pi2_sessoes (sessao_id,usuario_id,expira_em) VALUES ($1,$2,$3)',[sessao,current.usuario_id,exp]);
    return {token,usuario:publicUser(current),expira_em:exp};});
}
