import { consultarAlertasLotes } from "../services/alertas-lotes";
import { EstoqueError } from "../services/estoque-validacao";
import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import { getDashboard } from "../services/dashboard";
const router = Router();
router.get("/dashboard", authenticateToken, (_req, res) => {
  try { res.set("Cache-Control","no-store").json(getDashboard()); }
  catch (error) {
    console.error("Erro ao consultar painel", error);
    res.status(500).json({ message: "Não foi possível carregar os indicadores de estoque." });
  }
});
router.get('/lotes/alertas',authenticateToken,(req,res)=>{
 try{res.set('Cache-Control','no-store').json(consultarAlertasLotes(req.query));}
 catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível consultar os alertas de validade.'});}}
});
export default router;
