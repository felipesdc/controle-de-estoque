import { Router } from "express";
import {
  getHistoricosEstadoPedido,
  getHistoricoEstadoPedido,
  createNewHistoricoEstadoPedido,
  updateExistingHistoricoEstadoPedido,
  deleteExistingHistoricoEstadoPedido,
} from "../controllers/historico-estado-pedido-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

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
  authenticateToken,
  createNewHistoricoEstadoPedido
); // Criar novo histórico de estado de pedido
router.put(
  "/historico-estado-pedido/:historico_id",
  authenticateToken,
  updateExistingHistoricoEstadoPedido
); // Atualizar histórico de estado de pedido por ID
router.delete(
  "/historico-estado-pedido/:historico_id",
  authenticateToken,
  deleteExistingHistoricoEstadoPedido
); // Deletar histórico de estado de pedido por ID

export default router;
