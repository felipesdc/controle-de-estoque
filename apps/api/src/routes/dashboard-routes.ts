import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import { getDashboard } from "../services/dashboard";
const router = Router();
router.get("/dashboard", authenticateToken, (_req, res) => {
  try { res.json(getDashboard()); }
  catch (error) {
    console.error("Erro ao consultar painel", error);
    res.status(500).json({ message: "Não foi possível carregar os indicadores de estoque." });
  }
});
export default router;
