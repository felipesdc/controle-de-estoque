import pool from '../config/db';
import { periodoValidade, validadeNormalizadaLoteSql } from './datas';
import { EstoqueError } from './estoque-validacao';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
// Reserved bindings: $1=today, $2=30-day boundary. Never use the product's legacy expiry.
export const baseAlertasLotes=`WITH saldos AS (
 SELECT produto_id,SUM(saldo_milesimos) AS identificado FROM pi2_lotes GROUP BY produto_id
), base AS (
 SELECT p.produto_id,p.produto_descricao,p.produto_codigo_barras AS produto_codigo,l.lote_id,l.codigo AS lote_codigo,
 l.saldo_milesimos,l.unidade,'lote' AS origem,
 ${validadeNormalizadaLoteSql} AS validade
 FROM pi2_lotes l JOIN pi2_produtos p ON p.produto_id=l.produto_id WHERE p.produto_estado=1 AND l.saldo_milesimos>0
 UNION ALL
 SELECT p.produto_id,p.produto_descricao,p.produto_codigo_barras,NULL,NULL,
 CAST(ROUND(COALESCE(p.produto_quantidade_estoque,0)*1000) AS INTEGER)-COALESCE(s.identificado,0),u.unidade_descricao,'sem_lote',NULL
 FROM pi2_produtos p LEFT JOIN saldos s ON s.produto_id=p.produto_id LEFT JOIN pi2_unidades u ON u.unidade_id=p.produto_unidade_id
 WHERE p.produto_estado=1 AND ROUND(COALESCE(p.produto_quantidade_estoque,0)*1000)>COALESCE(s.identificado,0)
), classificados AS (
 SELECT *,CASE WHEN validade IS NULL THEN 'sem_validade' WHEN validade<$1 THEN 'vencido' WHEN validade=$1 THEN 'hoje' WHEN validade<=$2 THEN 'em_breve' ELSE 'no_prazo' END AS situacao FROM base
)`;
const ordem="ORDER BY CASE situacao WHEN 'vencido' THEN 0 WHEN 'hoje' THEN 1 WHEN 'em_breve' THEN 2 WHEN 'sem_validade' THEN 3 ELSE 4 END,validade,produto_descricao COLLATE NOCASE,produto_id,lote_codigo COLLATE BINARY,lote_id";
function publicRow({saldo_milesimos,...row}:any){return {...row,quantidade:saldo_milesimos/1000};}
export function indicadoresLotes(execute:Execute,hoje:string,ate:string){
 const totais=execute(baseAlertasLotes+` SELECT
 COUNT(DISTINCT CASE WHEN situacao='vencido' THEN produto_id END) AS vencidos,
 COUNT(DISTINCT CASE WHEN situacao IN ('hoje','em_breve') THEN produto_id END) AS vencem_em_breve,
 COUNT(CASE WHEN situacao='vencido' THEN 1 END) AS lotes_vencidos,
 COUNT(CASE WHEN situacao IN ('hoje','em_breve') THEN 1 END) AS lotes_vencem_em_breve,
 COUNT(CASE WHEN situacao='hoje' THEN 1 END) AS lotes_vencem_hoje,
 COUNT(DISTINCT CASE WHEN situacao='sem_validade' THEN produto_id END) AS produtos_sem_validade,
 COUNT(CASE WHEN origem='lote' AND situacao='sem_validade' THEN 1 END) AS lotes_sem_validade,
 COUNT(CASE WHEN origem='sem_lote' THEN 1 END) AS produtos_sem_lote FROM classificados`,[hoje,ate]).rows[0];
 const vencimentos=execute(baseAlertasLotes+" SELECT * FROM classificados WHERE situacao IN ('vencido','hoje','em_breve') "+ordem+' LIMIT 6',[hoje,ate]).rows.map(publicRow);
 const pendencias=execute(baseAlertasLotes+" SELECT * FROM classificados WHERE situacao='sem_validade' ORDER BY origem='sem_lote' DESC,produto_descricao COLLATE NOCASE,produto_id,lote_codigo,lote_id LIMIT 6",[hoje,ate]).rows.map(publicRow);
 return {totais,vencimentos,pendencias};
}
export function consultarAlertasLotes(input:Record<string,unknown>,now=new Date()){
 const texto=(k:string,padrao='')=>{const v=input[k]??padrao;if(typeof v!=='string')throw new EstoqueError(400,'Filtro de alerta inválido.');return v.trim();};
 const vencimento=texto('vencimento','atencao'),q=texto('q');
 const escolhas:Record<string,string>={atencao:"situacao IN ('vencido','hoje','em_breve')",vencidos:"situacao='vencido'",hoje:"situacao='hoje'",em_breve:"situacao IN ('hoje','em_breve')",sem_validade:"situacao='sem_validade'",sem_lote:"origem='sem_lote'",todos:'1=1'};
 if(!Object.prototype.hasOwnProperty.call(escolhas,vencimento)||q.length>100)throw new EstoqueError(400,'Situação ou busca de até 100 caracteres inválida.');
 const inteiro=(k:string,padrao:string)=>{const v=texto(k,padrao);if(!/^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v)))throw new EstoqueError(400,'Paginação inválida.');return Number(v);};
 const pagina=inteiro('pagina','1'),tamanho=inteiro('tamanho','10');if(![10,25,50].includes(tamanho))throw new EstoqueError(400,'Use páginas de 10, 25 ou 50 registros.');
 const {hoje,ate}=periodoValidade(now);
 return pool.transaction(execute=>{
  const where=escolhas[vencimento]+" AND (produto_descricao LIKE $3 ESCAPE '\\' OR produto_codigo LIKE $3 ESCAPE '\\' OR lote_codigo LIKE $3 ESCAPE '\\' OR CAST(produto_id AS TEXT) LIKE $3 ESCAPE '\\')";
  const params=[hoje,ate,'%'+q.replace(/[\\%_]/g,'\\$&')+'%'];
  const resumo=execute(baseAlertasLotes+` SELECT COUNT(*) AS registros,COUNT(DISTINCT produto_id) AS produtos,COUNT(CASE WHEN origem='lote' THEN 1 END) AS lotes,COUNT(CASE WHEN origem='sem_lote' THEN 1 END) AS sem_lote FROM classificados WHERE ${where}`,params).rows[0];
  const atual=Math.min(pagina,Math.max(1,Math.ceil(resumo.registros/tamanho)));
  const itens=execute(baseAlertasLotes+` SELECT * FROM classificados WHERE ${where} ${ordem} LIMIT $4 OFFSET $5`,[...params,tamanho,(atual-1)*tamanho]).rows.map(publicRow);
  return {itens,total:resumo.registros,pagina:atual,tamanho,paginas:Math.max(1,Math.ceil(resumo.registros/tamanho)),resumo,gerado_em:now.toISOString(),filtros:{q,vencimento},criterios:{data_referencia:hoje,vencimento_ate:ate,vencimento_dias:30,fuso:'America/Sao_Paulo',origem_validade:'lote',somente_ativos:true,saldo_positivo:true}};
 });
}
