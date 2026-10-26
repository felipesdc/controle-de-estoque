import { Router } from "express";
import {
  createNewUnidade,
  deleteExistingUnidade,
  getUnidade,
  getUnidades,
  updateExistingUnidade,
} from "../controllers/unidade-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/unidade", authenticateToken, getUnidades); // Consultar todas as unidades
router.get("/unidade/:unidade_id", authenticateToken, getUnidade); // Consultar unidade por ID
router.post("/unidade", authenticateToken, createNewUnidade); // Criar nova unidade
router.put("/unidade/:unidade_id", authenticateToken, updateExistingUnidade); // Atualizar unidade por ID
router.delete("/unidade/:unidade_id", authenticateToken, deleteExistingUnidade); // Deletar unidade por ID

export default router;
