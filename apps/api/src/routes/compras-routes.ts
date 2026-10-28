import { Router, Response } from 'express';
import { authenticateToken, requireManager, AuthenticatedRequest } from '../middlewares/auth';
import { listarPedidos, obterPedido, salvarPedido, transicionar } from '../services/pedidos';
import { EstoqueError } from '../services/estoque';
const router=Router();
function run(res:Response,fn:()=>unknown,status=200) {try {res.status(status).json(fn());}catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else {console.error(e);res.status(500).json({message:'Não foi possível concluir a operação do pedido.'});}}}
router.use('/compras/pedidos',authenticateToken);
router.get('/compras/pedidos',(req,res)=>run(res,()=>listarPedidos(req.query)));
router.get('/compras/pedidos/:id',(req,res)=>run(res,()=>obterPedido(Number(req.params.id))));
router.post('/compras/pedidos',requireManager,(req:AuthenticatedRequest,res)=>run(res,()=>salvarPedido(req.body,req.userId!,req.get('Idempotency-Key')||''),201));
router.patch('/compras/pedidos/:id',requireManager,(req:AuthenticatedRequest,res)=>run(res,()=>salvarPedido(req.body,req.userId!,'',Number(req.params.id))));
router.post('/compras/pedidos/:id/:acao',requireManager,(req:AuthenticatedRequest,res)=>run(res,()=>transicionar(Number(req.params.id),req.params.acao,req.body,req.userId!,req.get('Idempotency-Key')||'')));
export default router;
