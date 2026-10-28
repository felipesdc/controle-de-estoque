import { Produto } from './produto.model';
export interface ProdutoCatalogo extends Produto {
  validade_catalogo: string | null;
  situacao_validade: 'vencido' | 'em_breve' | 'regular' | 'sem_validade';
}
export interface Catalogo {
  itens: ProdutoCatalogo[];
  total: number;
  pagina: number;
  tamanho: number;
  paginas: number;
  criterios: { data_referencia: string; vencimento_ate: string; estoque_baixo_abaixo_de: number };
}
