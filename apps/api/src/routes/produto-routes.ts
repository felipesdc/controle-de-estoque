import { EstoqueError } from "../services/estoque";
import { getCatalogo, patchProduto } from "../services/catalogo";
import { Router } from "express";
import {
  createNewProduto,
  deleteExistingProduto,
  getProduto,
  getProdutos,
  updateExistingProduto,
} from "../controllers/produto-controller";
import { authenticateToken, requireManager } from "../middlewares/auth";

const router = Router();
router.get("/catalogo/produtos", authenticateToken, (req, res) => {
  try { res.json(getCatalogo(req.query)); }
  catch (error) {
    if (error instanceof EstoqueError) res.status(error.status).json({ message: error.message });
    else { console.error(error); res.status(500).json({ message: "Não foi possível consultar o catálogo." }); }
  }
});
router.patch("/produto/:produto_id", authenticateToken, requireManager, (req, res) => {
  try { res.json(patchProduto(Number(req.params.produto_id), req.body)); }
  catch (error) {
    if (error instanceof EstoqueError) res.status(error.status).json({ message: error.message });
    else { console.error(error); res.status(500).json({ message: "Não foi possível atualizar o produto." }); }
  }
});

router.get("/produto", authenticateToken, getProdutos); // Consultar todos os produtos
router.get("/produto/:produto_id", authenticateToken, getProduto); // Consultar produto por ID
router.post("/produto", authenticateToken, requireManager, createNewProduto); // Criar novo produto
router.put("/produto/:produto_id", authenticateToken, requireManager, updateExistingProduto); // Atualizar produto por ID
router.delete("/produto/:produto_id", authenticateToken, requireManager, deleteExistingProduto); // Deletar produto por ID

export default router;
