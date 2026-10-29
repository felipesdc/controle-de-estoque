import { listarHistorico, responsaveisHistorico } from '../services/historico';
import { EstoqueError } from '../services/estoque';
import { Router } from "express";
import { createNewMovimentacaoEstoque, getMovimentacaoEstoque, getMovimentacoesEstoque, estornarMovimentacao, immutableMovimentacao } from "../controllers/movimentacao-estoque-controller";
import { authenticateToken, requireManager, requireStockOperator } from "../middlewares/auth";
const router = Router();
router.use("/movimentacao-estoque", authenticateToken);
router.get("/movimentacao-estoque", getMovimentacoesEstoque);
router.get('/movimentacao-estoque/historico', (req,res) => {
  try { res.json(listarHistorico(req.query)); } catch(e) { if(e instanceof EstoqueError) res.status(e.status).json({message:e.message}); else { console.error(e); res.status(500).json({message:'Não foi possível consultar o histórico.'}); } }
});
router.get('/movimentacao-estoque/responsaveis', (_req,res) => {
  try { res.json(responsaveisHistorico()); } catch(e) { console.error(e); res.status(500).json({message:'Não foi possível consultar os responsáveis.'}); }
});
router.get("/movimentacao-estoque/:movimento_id", getMovimentacaoEstoque);
router.post("/movimentacao-estoque", requireStockOperator, createNewMovimentacaoEstoque);
router.post("/movimentacao-estoque/:movimento_id/estorno", requireManager, estornarMovimentacao);
router.put("/movimentacao-estoque/:movimento_id", immutableMovimentacao);
router.delete("/movimentacao-estoque/:movimento_id", immutableMovimentacao);
export default router;
