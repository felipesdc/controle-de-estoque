import { getRelatorioEstoque } from './catalogo';
// Quote delimiters/newlines and neutralize spreadsheet formulas in textual cells.
export function csvCell(value:unknown):string {
  let text=value==null?'':String(value);
  if(typeof value==='string' && (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function estoqueCsv(data:ReturnType<typeof getRelatorioEstoque>) {
  const headers=['ID','Produto','Código de barras','Categoria','Unidade','Situação','Saldo','Validade','Situação da validade','Gerado em (UTC)','Data de referência (São Paulo)','Vencimento até','Estoque baixo abaixo de','Filtro busca','Filtro situação','Filtro estoque','Filtro validade','Filtro categoria'];
  const labels:Record<string,string>={vencido:'Vencido',em_breve:'Vence em até 30 dias',regular:'Regular',sem_validade:'Não informada ou inválida'};
  const f=data.filtros!;
  const lines=data.itens.map(p=>[p.produto_id,p.produto_descricao,p.produto_codigo_barras?"'"+p.produto_codigo_barras:'',p.produto_categoria,p.produto_unidade,p.produto_estado?'Ativo':'Inativo',Number(p.produto_quantidade_estoque||0).toFixed(3).replace('.',','),p.validade_catalogo,labels[p.situacao_validade],data.gerado_em,data.criterios.data_referencia,data.criterios.vencimento_ate,data.criterios.estoque_baixo_abaixo_de,f.q,f.estado,f.estoque,f.vencimento,f.categoria].map(csvCell).join(';'));
  return '\uFEFF'+[headers.map(csvCell).join(';'),...lines].join('\r\n')+'\r\n';
}
