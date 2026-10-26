import { Router } from "express";
import {
  getEstadosPedido,
  getEstadoPedido,
  createNewEstadoPedido,
  updateExistingEstadoPedido,
  deleteExistingEstadoPedido,
} from "../controllers/estado-pedido-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/estado-pedido", authenticateToken, getEstadosPedido); // Consultar todos os estados de pedido
router.get("/estado-pedido/:estado_id", authenticateToken, getEstadoPedido); // Consultar estado de pedido por ID
router.post("/estado-pedido", authenticateToken, createNewEstadoPedido); // Criar novo estado de pedido
router.put(
  "/estado-pedido/:estado_id",
  authenticateToken,
  updateExistingEstadoPedido
); // Atualizar estado de pedido por ID
router.delete(
  "/estado-pedido/:estado_id",
  authenticateToken,
  deleteExistingEstadoPedido
); // Deletar estado de pedido por ID

export default router;
