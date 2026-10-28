import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export type TipoCadastro = 'categorias' | 'unidades' | 'fornecedores';
export interface Cadastro { id: number; nome: string; contato: string; endereco: string; produtos?: number; pedidos?: number; itens_pedido?: number; total_vinculos: number; }
export interface PaginaCadastros { itens: Cadastro[]; total: number; pagina: number; tamanho: number; }
export const CADASTROS = {
  categorias: { titulo: 'Categorias', singular: 'categoria', descricao: 'Organize os produtos em grupos para facilitar a busca e a reposição.', icone: 'category', limite: 120 },
  unidades: { titulo: 'Unidades', singular: 'unidade', descricao: 'Defina como os produtos são medidos e mantenha o estoque consistente.', icone: 'straighten', limite: 120 },
  fornecedores: { titulo: 'Fornecedores', singular: 'fornecedor', descricao: 'Mantenha nomes, contatos e endereços de quem abastece seu estoque.', icone: 'local_shipping', limite: 200 },
};
@Injectable({ providedIn: 'root' })
export class CadastrosService {
  constructor(private http: HttpClient) {}
  listar(tipo: TipoCadastro, q: string, pagina: number, tamanho: number) {
    const params = new HttpParams().set('q', q).set('pagina', String(pagina)).set('tamanho', String(tamanho));
    return this.http.get<PaginaCadastros>(`${environment.apiurl}/cadastros/${tipo}`, { params }).pipe(timeout(15000));
  }
  salvar(tipo: TipoCadastro, dados: Partial<Cadastro>, id?: number) {
    const url = `${environment.apiurl}/cadastros/${tipo}`;
    return id ? this.http.patch<Cadastro>(`${url}/${id}`, dados).pipe(timeout(15000)) : this.http.post<Cadastro>(url, dados);
  }
  excluir(tipo: TipoCadastro, id: number) { return this.http.delete<void>(`${environment.apiurl}/cadastros/${tipo}/${id}`).pipe(timeout(15000)); }
}
