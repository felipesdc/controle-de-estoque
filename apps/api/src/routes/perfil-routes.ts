import { Router } from "express";
import {
  getPerfis,
  getPerfil,
  createNewPerfil,
  updateExistingPerfil,
  deleteExistingPerfil,
} from "../controllers/perfil-controller";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/perfil", authenticateToken, getPerfis); // Consultar todos os perfis
router.get("/perfil/:perfil_id", authenticateToken, getPerfil); // Consultar perfil por ID
router.post("/perfil", authenticateToken, requireAdmin, createNewPerfil); // Criar novo perfil
router.put("/perfil/:perfil_id", authenticateToken, requireAdmin, updateExistingPerfil); // Atualizar perfil por ID
router.delete("/perfil/:perfil_id", authenticateToken, requireAdmin, deleteExistingPerfil); // Deletar perfil por ID

export default router;
