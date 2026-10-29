import pool from '../config/db';
import { EstoqueError } from './estoque';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
export function gravarPrecosProduto(execute:Execute,value:unknown):number|null {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['compra_centavos','venda_centavos'].includes(k)))throw new EstoqueError(400,'Preços inválidos.');
  const v=value as Record<string,unknown>;
  if(!('compra_centavos'in v)||!('venda_centavos'in v))throw new EstoqueError(400,'Informe os dois campos de preço, com valor ou null.');
  for(const p of Object.values(v))if(p!==null&&(typeof p!=='number'||!Number.isSafeInteger(p)||p<0||p>1e12))throw new EstoqueError(400,'Preços devem ser centavos inteiros entre zero e 1 trilhão.');
  if(v.compra_centavos===null&&v.venda_centavos===null)return null;
  return execute('INSERT INTO pi2_precos(preco_compra,preco_venda,preco_data_inicial) VALUES($1,$2,$3) RETURNING preco_id', [v.compra_centavos===null?null:(Number(v.compra_centavos)/100).toFixed(2),v.venda_centavos===null?null:(Number(v.venda_centavos)/100).toFixed(2),new Date().toISOString()]).rows[0].preco_id;
}
export function lerPrecosProduto(value:number) {
  if(!Number.isSafeInteger(value)||value<=0)throw new EstoqueError(400,'Produto inválido.');
  return pool.transaction(execute=>{
    const p=execute('SELECT p.produto_preco_id,r.preco_compra,r.preco_venda FROM pi2_produtos p LEFT JOIN pi2_precos r ON r.preco_id=p.produto_preco_id WHERE p.produto_id=$1',[value]).rows[0];
    if(!p)throw new EstoqueError(404,'Produto não encontrado.');
    let legado_invalido=false;
    const centavos=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const text=String(v).trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(text)||Number(text)>1e10){legado_invalido=true;return null;}return Math.round(Number(text)*100);};
    const compra_centavos=centavos(p.preco_compra),venda_centavos=centavos(p.preco_venda);
    return {compra_centavos,venda_centavos,legado_invalido};
  });
}
