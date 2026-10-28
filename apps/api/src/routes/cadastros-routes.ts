import { Router, Response } from "express";
import { authenticateToken, requireManager } from "../middlewares/auth";
import { EstoqueError } from "../services/estoque";
import { TipoCadastro, tipoCadastro, listarCadastro, lerCadastro, salvarCadastro, excluirCadastro } from "../services/cadastros";
function failure(res: Response, error: unknown) {
  if (error instanceof EstoqueError) res.status(error.status).json({ message: error.message });
  else { console.error("Erro de cadastro", error); res.status(500).json({ message: "Não foi possível concluir a operação do cadastro." }); }
}
export function legacyCadastroRoutes(tipo: TipoCadastro, path: string, param: string) {
  const router = Router();
  router.get(path, authenticateToken, (_req,res) => { try { res.json(lerCadastro(tipo, undefined, true)); } catch(error) { failure(res,error); } });
  router.get(`${path}/:${param}`, authenticateToken, (req,res) => { try { res.json(lerCadastro(tipo,req.params[param],true)); } catch(error) { failure(res,error); } });
  router.post(path, authenticateToken, requireManager, (req,res) => { try { res.status(201).json(salvarCadastro(tipo,req.body,undefined,true)); } catch(error) { failure(res,error); } });
  router.put(`${path}/:${param}`, authenticateToken, requireManager, (req,res) => { try { res.json(salvarCadastro(tipo,req.body,req.params[param],true)); } catch(error) { failure(res,error); } });
  router.delete(`${path}/:${param}`, authenticateToken, requireManager, (req,res) => { try { excluirCadastro(tipo,req.params[param]); res.status(204).send(); } catch(error) { failure(res,error); } });
  return router;
}
const router = Router();
router.get("/cadastros/:tipo", authenticateToken, (req,res) => { try { res.json(listarCadastro(tipoCadastro(req.params.tipo as string),req.query)); } catch(error) { failure(res,error); } });
router.post("/cadastros/:tipo", authenticateToken, requireManager, (req,res) => { try { res.status(201).json(salvarCadastro(tipoCadastro(req.params.tipo as string),req.body)); } catch(error) { failure(res,error); } });
router.patch("/cadastros/:tipo/:id", authenticateToken, requireManager, (req,res) => { try { res.json(salvarCadastro(tipoCadastro(req.params.tipo as string),req.body,req.params.id)); } catch(error) { failure(res,error); } });
router.delete("/cadastros/:tipo/:id", authenticateToken, requireManager, (req,res) => { try { excluirCadastro(tipoCadastro(req.params.tipo as string),req.params.id); res.status(204).send(); } catch(error) { failure(res,error); } });
export default router;
