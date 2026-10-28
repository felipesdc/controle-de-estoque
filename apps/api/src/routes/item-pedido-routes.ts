import { Router } from "express";
import {
  getItensPedido,
  getItemPedido,
  createNewItemPedido,
  updateExistingItemPedido,
  deleteExistingItemPedido,
} from "../controllers/item-pedido-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();
// Legacy reads remain available. All writes go through transactional purchasing operations.
router.use('/item-pedido', (req,res,next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  authenticateToken(req,res,()=>requireManager(req,res,()=>{ res.status(405).json({message:'Use o fluxo de compras em /v1/compras/pedidos. Registros antigos são somente consulta.'}); }));
});

router.get("/item-pedido", authenticateToken, getItensPedido); // Consultar todos os itens de pedido
router.get("/item-pedido/:item_pedido_id", authenticateToken, getItemPedido); // Consultar item de pedido por ID
router.post("/item-pedido", authenticateToken, requireManager, createNewItemPedido); // Criar novo item de pedido
router.put(
  "/item-pedido/:item_pedido_id",
  authenticateToken, requireManager,
  updateExistingItemPedido
); // Atualizar item de pedido por ID
router.delete(
  "/item-pedido/:item_pedido_id",
  authenticateToken, requireManager,
  deleteExistingItemPedido
); // Deletar item de pedido por ID

export default router;
