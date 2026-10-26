import { Router } from "express";
import {
  getCategorias,
  getCategoria,
  createNewCategoria,
  updateExistingCategoria,
  deleteExistingCategoria,
} from "../controllers/categoria-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/categoria", authenticateToken, getCategorias); // Consultar todas as categorias
router.get("/categoria/:categoria_id", authenticateToken, getCategoria); // Consultar categoria por ID
router.post("/categoria", authenticateToken, createNewCategoria); // Criar nova categoria
router.put(
  "/categoria/:categoria_id",
  authenticateToken,
  updateExistingCategoria
); // Atualizar categoria por ID
router.delete(
  "/categoria/:categoria_id",
  authenticateToken,
  deleteExistingCategoria
); // Deletar categoria por ID

export default router;
