import { Router } from "express";
import {
  createNewFornecedor,
  deleteExistingFornecedor,
  getFornecedor,
  getFornecedores,
  updateExistingFornecedor,
} from "../controllers/fornecedor-controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/fornecedor", authenticateToken, getFornecedores); // Consultar todos as fornecedores
router.get("/fornecedor/:fornecedor_id", authenticateToken, getFornecedor); // Consultar fornecedor por ID
router.post("/fornecedor", authenticateToken, createNewFornecedor); // Criar novo fornecedor
router.put(
  "/fornecedor/:fornecedor_id",
  authenticateToken,
  updateExistingFornecedor
); // Atualizar fornecedor por ID
router.delete(
  "/fornecedor/:fornecedor_id",
  authenticateToken,
  deleteExistingFornecedor
); // Deletar fornecedor por ID

export default router;
