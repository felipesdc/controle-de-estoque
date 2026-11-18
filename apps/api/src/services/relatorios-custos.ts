import pool from '../config/db';
import { EstoqueError } from './estoque-validacao';
import { reais, medio } from './custos';
import { periodoValidade } from './datas';
import { csvCell } from './relatorios';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
function texto(input:any,key:string,fallback=''){const v=input[key]??fallback;if(typeof v!=='string')throw new EstoqueError(400,'Filtro inválido.');return v.trim();}
function dataValida(v:string,hoje:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v||v>hoje)throw new EstoqueError(400,'Informe uma data real, até hoje.');return v;}
function contexto(execute:Execute,input:any,now:Date){
 const hoje=periodoValidade(now).hoje,inicio=execute('SELECT inicio FROM pi2_custos_config WHERE id=1').rows[0].inicio;
 const desde=execute('SELECT dia_sao_paulo($1) AS dia',[inicio]).rows[0].dia,q=texto(input,'q');
 if(q.length>100)throw new EstoqueError(400,'Busca de até 100 caracteres.');
 return {hoje,desde,inicio,q,search:`%${q.replace(/[\\%_]/g,'\\$&')}%`};
}
const produtoFiltro="(p.produto_descricao LIKE $1 ESCAPE '\\' OR p.produto_codigo_barras LIKE $1 ESCAPE '\\' OR CAST(p.produto_id AS TEXT) LIKE $1 ESCAPE '\\')";
function pagina(input:any,total:number,exportar:boolean){
 const inteiro=(k:string,f:string)=>{const v=texto(input,k,f);if(!/^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v)))throw new EstoqueError(400,'Paginação inválida.');return Number(v);};
 const tamanho=inteiro('tamanho','10'),requested=inteiro('pagina','1');if(![10,25,50].includes(tamanho))throw new EstoqueError(400,'Tamanho inválido.');
 if(exportar&&total>10000)throw new EstoqueError(400,'Exporte até 10.000 produtos; refine a busca.');
 const atual=Math.min(requested,Math.max(1,Math.ceil(total/tamanho)));return {pagina:atual,tamanho,paginas:Math.max(1,Math.ceil(total/tamanho)),offset:exportar?0:(atual-1)*tamanho,limit:exportar?10000:tamanho};
}
export function relatorioCustos(input:any,now=new Date(),exportar=false){
 return pool.transaction(execute=>{
  const c=contexto(execute,input,now),data=dataValida(texto(input,'data',c.hoje),c.hoje);
  if(data<c.desde)throw new EstoqueError(400,`A posição histórica confiável começa em ${c.desde}. Não há custo retroativo presumido.`);
  const rows=execute(`SELECT e.*,p.produto_descricao AS produto,p.produto_codigo_barras AS codigo_atual,p.produto_estado AS ativo
    FROM pi2_produtos p JOIN pi2_custos_eventos e ON e.evento_id=(SELECT MAX(h.evento_id) FROM pi2_custos_eventos h WHERE h.produto_id=p.produto_id AND dia_sao_paulo(h.data)<=$2)
    WHERE ${produtoFiltro} ORDER BY p.produto_descricao COLLATE NOCASE,p.produto_id LIMIT 10001`,[c.search,data]).rows;
  if(rows.length>10000)throw new EstoqueError(400,'Refine a busca para consultar até 10.000 produtos.');
  let valor=0n,sem=0;
  for(const r of rows){if(r.valor_microcentavos===null)sem++;else valor+=BigInt(r.valor_microcentavos);}
  const p=pagina(input,rows.length,exportar);
  const itens=rows.slice(p.offset,p.offset+p.limit).map(r=>({produto_id:r.produto_id,produto:r.produto,codigo_atual:r.codigo_atual,ativo_atual:r.ativo,unidade:r.unidade,saldo:r.saldo_milesimos/1000,custo_medio_reais:medio(r.valor_microcentavos,r.saldo_milesimos),valor_reais:reais(r.valor_microcentavos),custo_conhecido:r.valor_microcentavos!==null,evento_id:r.evento_id,registrado_em:r.data,ultima_origem:r.natureza}));
  return {tipo:'custos' as const,itens,total:rows.length,pagina:p.pagina,tamanho:p.tamanho,paginas:p.paginas,gerado_em:now.toISOString(),cobertura_desde:c.inicio,filtros:{data,q:c.q},resumo:{produtos:rows.length,com_custo:rows.length-sem,sem_custo:sem,valor_conhecido_reais:reais(valor.toString())!,avaliacao_completa:sem===0}};
 });
}
export function evolucaoCustos(input:any,now=new Date()){
 return pool.transaction(execute=>{
  const c=contexto(execute,input,now),fim=dataValida(texto(input,'fim',c.hoje),c.hoje),inicio=dataValida(texto(input,'inicio',c.desde),c.hoje);
  const dias=Math.round((Date.parse(fim)-Date.parse(inicio))/86400000)+1;
  if(inicio<c.desde||inicio>fim||dias>366)throw new EstoqueError(400,`Use um período de até 366 dias a partir de ${c.desde}.`);
  const products=execute(`SELECT p.produto_id FROM pi2_produtos p WHERE ${produtoFiltro} LIMIT 10001`,[c.search]).rows;
  if(products.length>10000)throw new EstoqueError(400,'Refine a busca para consultar até 10.000 produtos.');
  const rows=execute(`WITH anteriores AS (
    SELECT e.*,ROW_NUMBER() OVER(PARTITION BY e.produto_id ORDER BY e.evento_id DESC) AS posicao FROM pi2_custos_eventos e JOIN pi2_produtos p ON p.produto_id=e.produto_id WHERE ${produtoFiltro} AND dia_sao_paulo(e.data)<$2
   ), eventos AS (
    SELECT produto_id,evento_id,data,saldo_milesimos,valor_microcentavos FROM anteriores WHERE posicao=1
    UNION ALL SELECT e.produto_id,e.evento_id,e.data,e.saldo_milesimos,e.valor_microcentavos FROM pi2_custos_eventos e JOIN pi2_produtos p ON p.produto_id=e.produto_id WHERE ${produtoFiltro} AND dia_sao_paulo(e.data)>=$2 AND dia_sao_paulo(e.data)<=$3
   ) SELECT *,dia_sao_paulo(data) AS dia FROM eventos ORDER BY dia,evento_id LIMIT 200001`,[c.search,inicio,fim]).rows;
  if(rows.length>200000)throw new EstoqueError(400,'Há muitos eventos. Reduza o período ou refine a busca.');
  const estados=new Map<number,string|null>(),ultimos=new Map<number,number>();let valor=0n,sem=0,index=0;
  const itens=[];
  for(let i=0;i<dias;i++){
   const dt=new Date(inicio+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+i);const dia=dt.toISOString().slice(0,10);
   while(index<rows.length&&rows[index].dia<=dia){const r=rows[index++];if((ultimos.get(r.produto_id)??0)>=r.evento_id)continue;ultimos.set(r.produto_id,r.evento_id);if(estados.has(r.produto_id)){const old=estados.get(r.produto_id);if(old===null)sem--;else valor-=BigInt(old!);}estados.set(r.produto_id,r.valor_microcentavos);if(r.valor_microcentavos===null)sem++;else valor+=BigInt(r.valor_microcentavos);}
   itens.push({dia,produtos:estados.size,sem_custo:sem,valor_conhecido_reais:reais(valor.toString())!,avaliacao_completa:sem===0});
  }
  return {tipo:'evolucao' as const,itens,total:itens.length,gerado_em:now.toISOString(),cobertura_desde:c.inicio,filtros:{inicio,fim,q:c.q}};
 });
}
const numeroCsv=(v:string|null)=>v===null?'':(v.replace(/[^0-9]/g,'').length>15?"'":'')+v.replace('.',',');
export function custosCsv(r:ReturnType<typeof relatorioCustos>){
 const rows=r.itens.map(i=>[r.filtros.data,i.produto_id,i.produto,i.codigo_atual?"'"+i.codigo_atual:'',i.unidade,i.saldo.toFixed(3).replace('.',','),numeroCsv(i.custo_medio_reais),numeroCsv(i.valor_reais),i.custo_conhecido?'Conhecido':'Desconhecido',i.registrado_em,r.cobertura_desde,r.gerado_em,r.filtros.q]);
 return '\uFEFF'+[['Data de posição (São Paulo)','ID','Produto atual','Código atual','Unidade registrada','Saldo','Custo médio (R$)','Valor (R$)','Custo','Última referência (UTC)','Cobertura desde (UTC)','Gerado em (UTC)','Busca'],...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function evolucaoCsv(r:ReturnType<typeof evolucaoCustos>){return '\uFEFF'+[['Dia (São Paulo)','Produtos','Produtos sem custo','Valor conhecido (R$)','Avaliação completa','Busca'],...r.itens.map(i=>[i.dia,i.produtos,i.sem_custo,numeroCsv(i.valor_conhecido_reais),i.avaliacao_completa?'Sim':'Não',r.filtros.q])].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';}
export function historicoCustos(produto:number,input:any={}){
 if(!Number.isSafeInteger(produto)||produto<=0)throw new EstoqueError(400,'Produto inválido.');
 return pool.transaction(execute=>{
  const p=execute('SELECT produto_descricao FROM pi2_produtos WHERE produto_id=$1',[produto]).rows[0];if(!p)throw new EstoqueError(404,'Produto não encontrado.');
  const total=execute('SELECT COUNT(*) AS n FROM pi2_custos_eventos WHERE produto_id=$1',[produto]).rows[0].n,page=pagina(input,total,false);
  const itens=execute(`SELECT e.*,u.usuario_nome AS usuario FROM pi2_custos_eventos e LEFT JOIN pi2_usuarios u ON u.usuario_id=e.usuario_id WHERE produto_id=$1 ORDER BY evento_id DESC LIMIT $2 OFFSET $3`,[produto,page.limit,page.offset]).rows.map(({solicitacao,chave,valor_microcentavos,valor_movimento_microcentavos,saldo_milesimos,...e})=>({...e,saldo:saldo_milesimos/1000,valor_reais:reais(valor_microcentavos),valor_movimento_reais:reais(valor_movimento_microcentavos),custo_medio_reais:medio(valor_microcentavos,saldo_milesimos)}));
  return {produto_id:produto,produto:p.produto_descricao,itens,total,pagina:page.pagina,tamanho:page.tamanho};
 });
}
