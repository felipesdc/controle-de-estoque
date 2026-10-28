import { Router } from "express";
import {
  getEstadosPedido,
  getEstadoPedido,
  createNewEstadoPedido,
  updateExistingEstadoPedido,
  deleteExistingEstadoPedido,
} from "../controllers/estado-pedido-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();
// Legacy reads remain available. All writes go through transactional purchasing operations.
router.use('/estado-pedido', (req,res,next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  authenticateToken(req,res,()=>requireManager(req,res,()=>{ res.status(405).json({message:'Use o fluxo de compras em /v1/compras/pedidos. Registros antigos são somente consulta.'}); }));
});

router.get("/estado-pedido", authenticateToken, getEstadosPedido); // Consultar todos os estados de pedido
router.get("/estado-pedido/:estado_id", authenticateToken, getEstadoPedido); // Consultar estado de pedido por ID
router.post("/estado-pedido", authenticateToken, requireManager, createNewEstadoPedido); // Criar novo estado de pedido
router.put(
  "/estado-pedido/:estado_id",
  authenticateToken, requireManager,
  updateExistingEstadoPedido
); // Atualizar estado de pedido por ID
router.delete(
  "/estado-pedido/:estado_id",
  authenticateToken, requireManager,
  deleteExistingEstadoPedido
); // Deletar estado de pedido por ID

export default router;
