import { relatorioCustos, evolucaoCustos, custosCsv, evolucaoCsv } from '../services/relatorios-custos';
import { relatorioConsumo, relatorioCompras, consumoCsv, comprasCsv } from '../services/relatorios-operacionais';
import { Router } from 'express';
import { authenticateToken, requireManager } from '../middlewares/auth';
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
for (const tipo of ['consumo','compras'] as const) {
  router.get(`/relatorios/${tipo}`, (req,res) => {
    try { res.set('Cache-Control','no-store').json(tipo==='consumo'?relatorioConsumo(req.query):relatorioCompras(req.query)); }
    catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível consultar o relatório.'});}}
  });
  router.get(`/relatorios/${tipo}.csv`, (req,res) => {
    try { const output=tipo==='consumo'?consumoCsv(relatorioConsumo(req.query,new Date(),true)):comprasCsv(relatorioCompras(req.query,new Date(),true));res.set({'Cache-Control':'no-store','Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${tipo}.csv"`,'X-Content-Type-Options':'nosniff'}).send(output); }
    catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível exportar o relatório.'});}}
  });
}
for(const nome of ['custos','custos/evolucao'] as const){
 router.get('/relatorios/'+nome,requireManager,(req,res)=>{
  try{res.set('Cache-Control','no-store').json(nome==='custos'?relatorioCustos(req.query):evolucaoCustos(req.query));}
  catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível consultar os custos.'});}}
 });
 router.get('/relatorios/'+nome+'.csv',requireManager,(req,res)=>{
  try{const output=nome==='custos'?custosCsv(relatorioCustos(req.query,new Date(),true)):evolucaoCsv(evolucaoCustos(req.query));res.set({'Cache-Control':'no-store','Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${nome==='custos'?'custos':'evolucao-custos'}.csv"`,'X-Content-Type-Options':'nosniff'}).send(output);}
  catch(e){if(e instanceof EstoqueError)res.status(e.status).json({message:e.message});else{console.error(e);res.status(500).json({message:'Não foi possível exportar os custos.'});}}
 });
}
export default router;
