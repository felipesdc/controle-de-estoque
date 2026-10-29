import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getRelatorioEstoque } from '../services/catalogo';
import { EstoqueError } from '../services/estoque';
import { estoqueCsv } from '../services/relatorios';
const router=Router();
router.use('/relatorios',authenticateToken);
router.get('/relatorios/estoque.csv',(req,res)=>{
  try {const data=getRelatorioEstoque(req.query,new Date(),true);res.set({'Cache-Control':'no-store','Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="estoque.csv"','X-Content-Type-Options':'nosniff'}).send(estoqueCsv(data));}
  catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível exportar o relatório.'});}}
});
router.get('/relatorios/estoque',(req,res)=>{
  try {res.set('Cache-Control','no-store').json(getRelatorioEstoque(req.query));}
  catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível consultar o relatório.'});}}
});
export default router;
