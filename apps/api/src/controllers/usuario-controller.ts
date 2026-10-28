import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { EstoqueError } from "../services/estoque";
import { usuarios,salvarUsuario,desativarUsuario,entrar } from "../services/acessos";
export function falhaAcesso(res:Response,error:unknown){if(error instanceof EstoqueError)res.status(error.status).json({message:error.message});else{console.error('Erro de acesso',error);res.status(500).json({message:'Não foi possível concluir a operação de acesso.'});}}
export const getUsuarios=(_req:AuthenticatedRequest,res:Response)=>{try{res.json(usuarios());}catch(e){falhaAcesso(res,e);}};
export const getUsuario=(req:AuthenticatedRequest,res:Response)=>{try{res.json(usuarios(req.params.usuario_id));}catch(e){falhaAcesso(res,e);}};
export const createNewUsuario=(req:AuthenticatedRequest,res:Response)=>{try{res.status(201).json(salvarUsuario(req.body,req.userId!,undefined,true));}catch(e){falhaAcesso(res,e);}};
export const updateExistingUsuario=(req:AuthenticatedRequest,res:Response)=>{try{res.json(salvarUsuario(req.body,req.userId!,req.params.usuario_id,true));}catch(e){falhaAcesso(res,e);}};
export const deleteExistingUsuario=(req:AuthenticatedRequest,res:Response)=>{try{desativarUsuario(req.params.usuario_id,req.userId!);res.status(204).send();}catch(e){falhaAcesso(res,e);}};
export const authenticateUsuario=async(req:AuthenticatedRequest,res:Response)=>{try{res.set("Cache-Control","no-store").json(await entrar(req.body.usuario_login,req.body.usuario_password));}catch(e){falhaAcesso(res,e);}};
