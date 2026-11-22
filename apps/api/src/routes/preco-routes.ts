import {Router} from 'express';
import pool from '../config/db';
import {authenticateToken,requireManager} from '../middlewares/auth';
const router=Router();
router.use('/preco',authenticateToken,requireManager);
router.get('/preco',async(_req,res)=>{res.set('Cache-Control','no-store').json((await pool.query('SELECT * FROM pi2_precos ORDER BY preco_id')).rows);});
router.get('/preco/:preco_id',async(req,res)=>{const id=Number(req.params.preco_id);if(!Number.isSafeInteger(id)||id<=0){res.status(400).json({message:'Preço inválido.'});return;}const row=(await pool.query('SELECT * FROM pi2_precos WHERE preco_id=$1',[id])).rows[0];if(!row){res.status(404).json({message:'Preço não encontrado.'});return;}res.set('Cache-Control','no-store').json(row);});
router.use('/preco',(_req,res)=>{res.status(405).json({message:'O cadastro compartilhado de preços é somente leitura. Edite produto_precos em PATCH /v1/produto/{id}, usando centavos inteiros.'});});
export default router;
