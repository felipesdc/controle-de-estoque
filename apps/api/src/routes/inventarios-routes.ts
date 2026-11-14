import { Router, Response } from 'express';
import { authenticateToken, requireManager, AuthenticatedRequest } from '../middlewares/auth';
import { EstoqueError } from '../services/estoque';
import { listarInventarios, obterInventario, criarInventario, salvarContagem, acaoInventario } from '../services/inventarios';
const router=Router();
router.use('/inventarios',authenticateToken,requireManager);
function run(res:Response,fn:()=>unknown,status=200){try{res.setHeader('Cache-Control','no-store');res.status(status).json(fn());}catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível concluir a operação do inventário.'});}}}
router.get('/inventarios',(req,res)=>run(res,()=>listarInventarios(req.query)));
router.get('/inventarios/:id',(req,res)=>run(res,()=>obterInventario(Number(req.params.id))));
router.post('/inventarios',(req:AuthenticatedRequest,res)=>run(res,()=>criarInventario(req.body,req.userId!,req.get('Idempotency-Key')||''),201));
router.patch('/inventarios/:id',(req:AuthenticatedRequest,res)=>run(res,()=>salvarContagem(Number(req.params.id),req.body,req.userId!)));
router.post('/inventarios/:id/:acao',(req:AuthenticatedRequest,res)=>run(res,()=>acaoInventario(Number(req.params.id),req.params.acao,req.body,req.userId!,req.get('Idempotency-Key')||'')));
export default router;
