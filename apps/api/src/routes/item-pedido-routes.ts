import { Router } from "express";
import {
  getItensPedido,
  getItemPedido,
  createNewItemPedido,
  updateExistingItemPedido,
  deleteExistingItemPedido,
} from "../controllers/item-pedido-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/item-pedido", authenticateToken, getItensPedido); // Consultar todos os itens de pedido
router.get("/item-pedido/:item_pedido_id", authenticateToken, getItemPedido); // Consultar item de pedido por ID
router.post("/item-pedido", authenticateToken, createNewItemPedido); // Criar novo item de pedido
router.put(
  "/item-pedido/:item_pedido_id",
  authenticateToken,
  updateExistingItemPedido
); // Atualizar item de pedido por ID
router.delete(
  "/item-pedido/:item_pedido_id",
  authenticateToken,
  deleteExistingItemPedido
); // Deletar item de pedido por ID

export default router;
