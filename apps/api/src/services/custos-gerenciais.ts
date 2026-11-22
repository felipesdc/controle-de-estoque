import pool from '../config/db';
import {EstoqueError} from './estoque-validacao';
import {centavosInteiros,centavosLegados} from './dinheiro';
import {reais,medio,dividir} from './custos';
type Execute=Parameters<Parameters<typeof pool.transaction>[0]>[0];
const escala=1000000n;
const erro=(s:string):never=>{throw new EstoqueError(400,s);};
const tratamentos=['informativo','recuperavel_incluso','recuperavel_adicional','nao_recuperavel_incluso','nao_recuperavel_adicional'];
export function validarCustos(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))erro('Custos de aquisição inválidos.');const v=value as any;
 if(Object.keys(v).some(k=>!['frete_centavos','despesas_centavos','desconto_centavos','tributos','referencia_documento','regime','ibs_cbs_regular'].includes(k)))erro('Campos de custo não permitidos.');
 const texto=(key:string,max:number)=>{const s=v[key]??'';if(typeof s!=='string'||s.length>max)erro('Referência de custo inválida.');return s.trim();};
 if(v.ibs_cbs_regular!==undefined&&typeof v.ibs_cbs_regular!=='boolean')erro('Opção de IBS/CBS inválida.');
 const ibs_cbs_regular=v.ibs_cbs_regular===true;
 const regime=v.regime??'simples';if(!['nao_informado','mei','simples','presumido','real'].includes(regime))erro('Regime inválido.');
 if(v.tributos!==undefined&&(!Array.isArray(v.tributos)||v.tributos.length>20))erro('Informe até 20 linhas de tributos.');
 const tributos=(v.tributos??[]).map((t:any)=>{if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['codigo','tratamento','valor_centavos'].includes(k))||!['IBS','CBS','IS','ICMS','IPI','PIS','COFINS','OUTRO'].includes(t.codigo)||!tratamentos.includes(t.tratamento))erro('Tributo ou tratamento inválido.');return{codigo:t.codigo,tratamento:t.tratamento,valor_centavos:centavosInteiros(t.valor_centavos,'Tributo')};});
 if(['simples','mei'].includes(regime)&&!ibs_cbs_regular&&tributos.some((t:any)=>['IBS','CBS'].includes(t.codigo)&&t.tratamento.startsWith('recuperavel')))erro('IBS/CBS recolhidos no Simples não permitem apropriação de créditos. Informe a opção pelo regime regular somente quando efetivamente aplicável.');
 const referencia_documento=texto('referencia_documento',160);if(tributos.length&&!referencia_documento)erro('Informe o documento e a referência usados para classificar os tributos.');
 return {frete_centavos:centavosInteiros(v.frete_centavos??0,'Frete'),despesas_centavos:centavosInteiros(v.despesas_centavos??0,'Despesas'),desconto_centavos:centavosInteiros(v.desconto_centavos??0,'Desconto'),tributos,referencia_documento,regime,ibs_cbs_regular};
}
export function ratearAquisicao(linhas:{item:number;quantidade:number;preco:number}[],custos:ReturnType<typeof validarCustos>){
 const bases=linhas.map(l=>BigInt(l.quantidade)*BigInt(l.preco)*1000n),base=bases.reduce((a,b)=>a+b,0n);
 let adicional=BigInt(custos.frete_centavos)+BigInt(custos.despesas_centavos)-BigInt(custos.desconto_centavos);
 for(const t of custos.tributos){if(t.tratamento==='nao_recuperavel_adicional')adicional+=BigInt(t.valor_centavos);if(t.tratamento==='recuperavel_incluso')adicional-=BigInt(t.valor_centavos);}
 const total=base+adicional*escala;if(total<0n)erro('Descontos e tributos recuperáveis não podem tornar o custo negativo.');
 const pesos=base===0n?linhas.map(()=>1n):bases,soma=pesos.reduce((a,b)=>a+b,0n);if(!soma)erro('Recebimento sem itens para ratear.');
 const valores=pesos.map(p=>total*p/soma);let resto=total-valores.reduce((a,b)=>a+b,0n);
 const ordem=pesos.map((p,i)=>({i,resto:total*p%soma,id:linhas[i].item})).sort((a,b)=>a.resto===b.resto?a.id-b.id:a.resto>b.resto?-1:1);
 for(const r of ordem){if(resto===0n)break;valores[r.i]++;resto--;}
 return {base:base.toString(),total:total.toString(),criterio:base===0n?'igual_por_linha':'valor_mercadorias',linhas:linhas.map((l,i)=>({item:l.item,base:bases[i].toString(),custo:valores[i].toString()}))};
}
export function custosEntrega(execute:Execute,entrega:number){const r=execute('SELECT * FROM pi2_entrega_custos WHERE entrega_id=$1',[entrega]).rows[0];return r?{...JSON.parse(r.dados),base_reais:reais(r.base_microcentavos),custo_reais:reais(r.total_microcentavos),base_microcentavos:r.base_microcentavos,total_microcentavos:r.total_microcentavos}:null;}
export function registrarCredito(pedido:number,entrega:number,body:any,usuario:number,chave:string){
 if(!Number.isSafeInteger(pedido)||pedido<=0||!Number.isSafeInteger(entrega)||entrega<=0||!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['valor_centavos','documento','motivo'].includes(k)))erro('Crédito inválido.');
 const valor=centavosInteiros(body.valor_centavos,'Crédito');if(!valor||typeof body.documento!=='string'||!body.documento.trim()||body.documento.length>120||typeof body.motivo!=='string'||body.motivo.trim().length<3||body.motivo.length>450||! /^[\w-]{16,80}$/.test(chave))erro('Informe valor positivo, documento, motivo e chave válidos.');
 const payload=JSON.stringify({pedido,entrega,usuario,valor,documento:body.documento.trim(),motivo:body.motivo.trim()});
 return pool.transaction(execute=>{const actor=execute('SELECT usuario_status,usuario_perfil_id FROM pi2_usuarios WHERE usuario_id=$1',[usuario]).rows[0];if(!actor?.usuario_status||![1,2].includes(actor.usuario_perfil_id))throw new EstoqueError(403,'Crédito restrito à gestão.');
 const e=execute('SELECT * FROM pi2_entregas_pedido WHERE entrega_id=$1 AND pedido_id=$2',[entrega,pedido]).rows[0];if(!e||e.tipo!=='devolver')throw new EstoqueError(409,'Selecione uma devolução deste pedido.');
 const old=execute('SELECT * FROM pi2_creditos_devolucao WHERE chave=$1',[chave]).rows[0];if(old){if(old.solicitacao!==payload)throw new EstoqueError(409,'Chave utilizada com outro crédito.');return{credito_id:old.credito_id};}
 const soma=execute('SELECT COALESCE(SUM(valor_centavos),0) total FROM pi2_creditos_devolucao WHERE entrega_id=$1',[entrega]).rows[0].total;if(soma+valor>1e12)erro('Créditos da devolução excedem o limite.');
 return execute('INSERT INTO pi2_creditos_devolucao(entrega_id,valor_centavos,documento,motivo,usuario_id,data,chave,solicitacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING credito_id',[entrega,valor,body.documento.trim(),body.motivo.trim(),usuario,new Date().toISOString(),chave,payload]).rows[0];});
}
export function margemProduto(produto:number){return pool.transaction(execute=>{const p=execute('SELECT p.*,r.preco_venda FROM pi2_produtos p LEFT JOIN pi2_precos r ON r.preco_id=p.produto_preco_id WHERE p.produto_id=$1',[produto]).rows[0];if(!p)throw new EstoqueError(404,'Produto não encontrado.');const c=execute('SELECT * FROM pi2_custos_eventos WHERE produto_id=$1 ORDER BY evento_id DESC LIMIT 1',[produto]).rows[0];const venda=centavosLegados(p.preco_venda);const conhecido=c&&c.valor_microcentavos!==null&&c.saldo_milesimos>0&&c.unidade_id===p.produto_unidade_id&&c.saldo_milesimos===Math.round((p.produto_quantidade_estoque??0)*1000);let margem:string|null=null;
 if(conhecido&&venda!==null&&venda>0){const receita=BigInt(venda)*BigInt(c.saldo_milesimos)*1000n,diferenca=receita-BigInt(c.valor_microcentavos),neg=diferenca<0n;const pontos=dividir((neg?-diferenca:diferenca)*10000n,receita);margem=(neg?'-':'')+String(pontos/100n)+'.'+String(pontos%100n).padStart(2,'0');}
 return{produto_id:produto,venda_centavos:venda,custo_medio_reais:conhecido?medio(c.valor_microcentavos,c.saldo_milesimos):null,margem_bruta_percentual:margem,estimativa:true,observacao:'Margem sobre o preço cadastral, antes de tributos da venda, despesas comerciais e descontos. Não representa lucro realizado.'};});}
