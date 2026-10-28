import { Router } from "express";
import {
  getHistoricosEstadoPedido,
  getHistoricoEstadoPedido,
  createNewHistoricoEstadoPedido,
  updateExistingHistoricoEstadoPedido,
  deleteExistingHistoricoEstadoPedido,
} from "../controllers/historico-estado-pedido-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();
// Legacy reads remain available. All writes go through transactional purchasing operations.
router.use('/historico-estado-pedido', (req,res,next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  authenticateToken(req,res,()=>requireManager(req,res,()=>{ res.status(405).json({message:'Use o fluxo de compras em /v1/compras/pedidos. Registros antigos são somente consulta.'}); }));
});

router.get(
  "/historico-estado-pedido",
  authenticateToken,
  getHistoricosEstadoPedido
); // Consultar todos os históricos de estado de pedido
router.get(
  "/historico-estado-pedido/:historico_id",
  authenticateToken,
  getHistoricoEstadoPedido
); // Consultar histórico de estado de pedido por ID
router.post(
  "/historico-estado-pedido",
  authenticateToken, requireManager,
  createNewHistoricoEstadoPedido
); // Criar novo histórico de estado de pedido
router.put(
  "/historico-estado-pedido/:historico_id",
  authenticateToken, requireManager,
  updateExistingHistoricoEstadoPedido
); // Atualizar histórico de estado de pedido por ID
router.delete(
  "/historico-estado-pedido/:historico_id",
  authenticateToken, requireManager,
  deleteExistingHistoricoEstadoPedido
); // Deletar histórico de estado de pedido por ID

export default router;
