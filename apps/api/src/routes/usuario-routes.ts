import { Router } from "express";
import {
  getUsuarios,
  getUsuario,
  createNewUsuario,
  updateExistingUsuario,
  deleteExistingUsuario,
  authenticateUsuario,
} from "../controllers/usuario-controller";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/usuario", authenticateToken, getUsuarios); // Consultar todos os usuários
router.get("/usuario/:usuario_id", authenticateToken, getUsuario); // Consultar usuário por ID
router.post("/usuario/login", authenticateUsuario); // Autentica Usuário por JWT
router.post("/usuario", authenticateToken, requireAdmin, createNewUsuario); // Criar novo usuário
router.put("/usuario/:usuario_id", authenticateToken, requireAdmin, updateExistingUsuario); // Atualizar usuário por ID
router.delete("/usuario/:usuario_id", authenticateToken, requireAdmin, deleteExistingUsuario); // Deletar usuário por ID

export default router;
