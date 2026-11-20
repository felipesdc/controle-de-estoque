import {Router,Response} from 'express';
import {authenticateToken,AuthenticatedRequest} from '../middlewares/auth';
import {falhaAcesso} from '../controllers/usuario-controller';
import {estadoSeguranca,prepararMfa,ativarMfa,gerenciarMfa,concluirEntrada,alterarSenha} from '../services/seguranca';
import {configuracaoEmail,solicitarRecuperacao,redefinirSenha} from '../services/recuperacao';
import {EstoqueError} from '../services/estoque-validacao';
const router=Router();
async function run(res:Response,fn:()=>unknown,status=200){try{res.set('Cache-Control','no-store');res.status(status).json(await fn());}catch(e){falhaAcesso(res,e);}}
function fields(body:any,allowed:string[]){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))throw new EstoqueError(400,'Campos de segurança inválidos.');}
router.get('/auth/configuracao',(_req,res)=>{res.set('Cache-Control','no-store').json({recuperacao_email:!!configuracaoEmail()});});
router.post('/auth/mfa',(req,res)=>run(res,()=>{fields(req.body,['desafio','codigo']);return concluirEntrada(req.body.desafio,req.body.codigo,req.ip||'local');}));
router.post('/auth/recuperar',(req,res)=>run(res,()=>{fields(req.body,['email']);return solicitarRecuperacao(req.body.email,req.ip||'local');},202));
router.post('/auth/redefinir',(req,res)=>run(res,()=>{fields(req.body,['token','senha']);return redefinirSenha(req.body.token,req.body.senha,req.ip||'local');}));
router.use('/seguranca',authenticateToken);
router.get('/seguranca',(req:AuthenticatedRequest,res)=>run(res,()=>estadoSeguranca(req.userId!)));
router.post('/seguranca/mfa/preparar',(req:AuthenticatedRequest,res)=>run(res,()=>{fields(req.body,['senha']);return prepararMfa(req.userId!,req.body.senha);}));
router.post('/seguranca/mfa/ativar',(req:AuthenticatedRequest,res)=>run(res,()=>{fields(req.body,['codigo']);return ativarMfa(req.userId!,req.body.codigo,req.sessionId!);}));
for(const acao of ['desativar','codigos'])router.post('/seguranca/mfa/'+acao,(req:AuthenticatedRequest,res)=>run(res,()=>{fields(req.body,['senha','codigo']);return gerenciarMfa(req.userId!,req.body.senha,req.body.codigo,req.sessionId!,acao==='desativar');}));
router.post('/seguranca/senha',(req:AuthenticatedRequest,res)=>run(res,()=>{fields(req.body,['senha_atual','nova_senha','codigo']);return alterarSenha(req.userId!,req.body.senha_atual,req.body.nova_senha,req.body.codigo);}));
export default router;
