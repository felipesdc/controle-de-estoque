import pool from '../config/db';
import {EstoqueError} from './estoque-validacao';
export function opcoesProdutos(input:Record<string,unknown>){
 const fail=():never=>{throw new EstoqueError(400,'Parâmetros de opções inválidos.');};
 const id=(v:unknown)=>typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):fail();
 const q=input.q??'';if(typeof q!=='string'||q.length>100)fail();
 const pagina=input.pagina===undefined?1:id(input.pagina),selecionado=input.selecionado===undefined?null:id(input.selecionado);
 const termo=`%${(q as string).trim().replace(/[\\%_]/g,'\\$&')}%`;
 return pool.transaction(execute=>{
  const where="WHERE produto_estado=1 AND produto_descricao LIKE $1 ESCAPE '\\'";
  const total=execute(`SELECT COUNT(*) total FROM pi2_produtos ${where}`,[termo]).rows[0].total;
  const atual=Math.min(pagina,Math.max(1,Math.ceil(total/25)));
  const projection='SELECT produto_id AS id,produto_descricao AS nome FROM pi2_produtos';
  return {total,pagina:atual,tamanho:25,itens:execute(`${projection} ${where} ORDER BY produto_descricao COLLATE NOCASE,produto_id LIMIT 25 OFFSET $2`,[termo,(atual-1)*25]).rows,selecionado:selecionado===null?null:execute(`${projection} WHERE produto_id=$1 AND produto_estado=1`,[selecionado]).rows[0]??null};
 });
}
