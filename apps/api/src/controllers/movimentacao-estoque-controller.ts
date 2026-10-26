import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { getAllMovimentacoesEstoque, getMovimentacaoEstoqueById } from "../models/movimentacao-estoque";
import { EstoqueError, movimentar, estornar } from "../services/estoque";
function failure(res: Response, error: unknown) {
  if (error instanceof EstoqueError) res.status(error.status).json({ message: error.message });
  else { console.error(error); res.status(500).json({ message: "Não foi possível concluir a operação." }); }
}
export const getMovimentacoesEstoque = async (_req: AuthenticatedRequest, res: Response) => {
  try { res.json(await getAllMovimentacoesEstoque()); } catch (error) { failure(res, error); }
};
export const getMovimentacaoEstoque = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row = await getMovimentacaoEstoqueById(Number(req.params.movimento_id));
    if (!row) { res.status(404).json({ message: "Movimentação não encontrada." }); return; }
    res.json(row);
  } catch (error) { failure(res, error); }
};
export const createNewMovimentacaoEstoque = (req: AuthenticatedRequest, res: Response) => {
  try { res.status(201).json(movimentar(req.body, req.userId!, req.get("Idempotency-Key") || "")); }
  catch (error) { failure(res, error); }
};
export const estornarMovimentacao = (req: AuthenticatedRequest, res: Response) => {
  try { res.status(201).json(estornar(Number(req.params.movimento_id), req.body.motivo, req.userId!, req.get("Idempotency-Key") || "")); }
  catch (error) { failure(res, error); }
};
export const immutableMovimentacao = (_req: AuthenticatedRequest, res: Response) => {
  res.status(405).json({ message: "O histórico é imutável. Registre um estorno para corrigir uma movimentação." });
};
