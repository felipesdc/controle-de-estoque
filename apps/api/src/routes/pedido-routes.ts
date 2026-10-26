import { Router } from "express";
import {
  getPedidos,
  getPedido,
  createNewPedido,
  updateExistingPedido,
  deleteExistingPedido,
} from "../controllers/pedido-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/pedido", authenticateToken, getPedidos); // Consultar todos os pedidos
router.get("/pedido/:pedido_id", authenticateToken, getPedido); // Consultar pedido por ID
router.post("/pedido", authenticateToken, createNewPedido); // Criar novo pedido
router.put("/pedido/:pedido_id", authenticateToken, updateExistingPedido); // Atualizar pedido por ID
router.delete("/pedido/:pedido_id", authenticateToken, deleteExistingPedido); // Deletar pedido por ID

export default router;
