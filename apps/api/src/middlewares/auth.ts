import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db";
export interface AuthenticatedRequest extends Request { userId?: number; roleId?: number; sessionId?: string; expiresAt?: number; }
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) { res.status(401).json({ message: "Token não fornecido" }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    if (!Number.isSafeInteger(decoded.usuario_id) || typeof decoded.jti !== "string") throw new Error("Token inválido");
    const user = (await pool.query("SELECT u.usuario_id, u.usuario_perfil_id, u.usuario_status FROM pi2_usuarios u JOIN pi2_sessoes s ON s.usuario_id=u.usuario_id WHERE u.usuario_id = $1 AND s.sessao_id=$2 AND s.expira_em > $3", [decoded.usuario_id, decoded.jti, Math.floor(Date.now()/1000)])).rows[0];
    if (!user?.usuario_status) { res.status(401).json({ message: "Usuário inativo ou inexistente" }); return; }
    req.userId = user.usuario_id; req.roleId = user.usuario_perfil_id; req.sessionId=decoded.jti; req.expiresAt=decoded.exp;
    next();
  } catch { res.status(401).json({ message: "Token inválido ou expirado" }); }
};
export const requireManager = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (![1, 2].includes(req.roleId!)) { res.status(403).json({ message: "Apenas administradores e gerentes podem realizar esta operação." }); return; }
  next();
};
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.roleId !== 1) { res.status(403).json({ message: "Acesso restrito ao administrador." }); return; }
  next();
};
