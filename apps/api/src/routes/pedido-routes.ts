import { Router } from "express";
import {
  getPedidos,
  getPedido,
  createNewPedido,
  updateExistingPedido,
  deleteExistingPedido,
} from "../controllers/pedido-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();
// Legacy reads remain available. All writes go through transactional purchasing operations.
router.use('/pedido', (req,res,next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  authenticateToken(req,res,()=>requireManager(req,res,()=>{ res.status(405).json({message:'Use o fluxo de compras em /v1/compras/pedidos. Registros antigos são somente consulta.'}); }));
});

router.get("/pedido", authenticateToken, getPedidos); // Consultar todos os pedidos
router.get("/pedido/:pedido_id", authenticateToken, getPedido); // Consultar pedido por ID
router.post("/pedido", authenticateToken, requireManager, createNewPedido); // Criar novo pedido
router.put("/pedido/:pedido_id", authenticateToken, requireManager, updateExistingPedido); // Atualizar pedido por ID
router.delete("/pedido/:pedido_id", authenticateToken, requireManager, deleteExistingPedido); // Deletar pedido por ID

export default router;
