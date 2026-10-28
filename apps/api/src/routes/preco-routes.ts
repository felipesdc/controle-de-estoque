import { Router } from "express";
import {
  getPrecos,
  getPreco,
  createNewPreco,
  updateExistingPreco,
  deleteExistingPreco,
} from "../controllers/preco-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();

router.get("/preco", authenticateToken, getPrecos); // Consultar todos os preços
router.get("/preco/:preco_id", authenticateToken, getPreco); // Consultar preço por ID
router.post("/preco", authenticateToken, requireManager, createNewPreco); // Criar novo preço
router.put("/preco/:preco_id", authenticateToken, requireManager, updateExistingPreco); // Atualizar preço por ID
router.delete("/preco/:preco_id", authenticateToken, requireManager, deleteExistingPreco); // Deletar preço por ID

export default router;
