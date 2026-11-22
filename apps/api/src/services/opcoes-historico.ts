import pool from '../config/db';
import {EstoqueError} from './estoque-validacao';
export function opcoesHistorico(input:Record<string,unknown>,tipo:'produtos'|'responsaveis'){
 const fail=():never=>{throw new EstoqueError(400,'Parâmetros de opções inválidos.');};
 const id=(v:unknown)=>typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):fail();
 const q=input.q??'';if(typeof q!=='string'||q.length>100)fail();
 const pagina=input.pagina===undefined?1:id(input.pagina),selecionado=input.selecionado===undefined?null:id(input.selecionado);
 const source=tipo==='produtos'?"SELECT produto_id id,produto_descricao || CASE WHEN produto_estado=1 THEN '' ELSE ' (inativo)' END nome FROM pi2_produtos":"SELECT usuario_id id,usuario_nome nome FROM pi2_usuarios u WHERE EXISTS(SELECT 1 FROM pi2_movimentos_estoque m WHERE m.movimento_usuario_id=u.usuario_id)";
 const termo=`%${(q as string).trim().replace(/[\\%_]/g,'\\$&')}%`;
 return pool.transaction(execute=>{const total=execute(`SELECT COUNT(*) total FROM (${source}) WHERE nome LIKE $1 ESCAPE '\\'`,[termo]).rows[0].total,atual=Math.min(pagina,Math.max(1,Math.ceil(total/25)));return{total,pagina:atual,tamanho:25,itens:execute(`SELECT * FROM (${source}) WHERE nome LIKE $1 ESCAPE '\\' ORDER BY nome COLLATE NOCASE,id LIMIT 25 OFFSET $2`,[termo,(atual-1)*25]).rows,selecionado:selecionado===null?null:execute(`SELECT * FROM (${source}) WHERE id=$1`,[selecionado]).rows[0]??null};});
}
