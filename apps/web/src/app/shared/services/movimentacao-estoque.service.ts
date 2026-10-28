import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { MovimentacaoEstoque } from '../models/movimentacao-estoque.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MovimentacaoEstoqueService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  historico(filtros: Record<string, string | number>): Observable<{itens: MovimentacaoEstoque[]; total: number; pagina: number; tamanho: number}> {
    let params = new HttpParams();
    for (const [key,value] of Object.entries(filtros)) if (value !== '') params = params.set(key,value);
    return this.http.get<{itens: MovimentacaoEstoque[]; total: number; pagina: number; tamanho: number}>(`${environment.apiurl}/movimentacao-estoque/historico`, {params});
  }
  responsaveis(): Observable<{id: number; nome: string}[]> {
    return this.http.get<{id: number; nome: string}[]>(`${environment.apiurl}/movimentacao-estoque/responsaveis`);
  }

  getMovimentacoesEstoque(): Observable<MovimentacaoEstoque[]> {
    return this.http.get<MovimentacaoEstoque[]>(
      `${environment.apiurl}/movimentacao-estoque`
    );
  }

  getMovimentacaoEstoque(
    movimento_id: number
  ): Observable<MovimentacaoEstoque> {
    return this.http.get<MovimentacaoEstoque>(
      `${environment.apiurl}/movimentacao-estoque/${movimento_id}`
    );
  }

  createNewMovimentacaoEstoque(
    movimentacaoEstoque: MovimentacaoEstoque,
    chave: string = crypto.randomUUID()
  ): Observable<MovimentacaoEstoque> {
    return this.http.post<MovimentacaoEstoque>(
      `${environment.apiurl}/movimentacao-estoque`,
      movimentacaoEstoque,
      { headers: { "Idempotency-Key": chave } }
    );
  }

  estornar(id: number, motivo: string, chave: string): Observable<MovimentacaoEstoque> {
    return this.http.post<MovimentacaoEstoque>(`${environment.apiurl}/movimentacao-estoque/${id}/estorno`, { motivo }, { headers: { 'Idempotency-Key': chave } });
  }

  updateExistingMovimentacaoEstoque(
    movimentacaoEstoque: MovimentacaoEstoque,
    movimento_id: number
  ): Observable<MovimentacaoEstoque> {
    return this.http.put<MovimentacaoEstoque>(
      `${environment.apiurl}/movimentacao-estoque/${movimento_id}`,
      movimentacaoEstoque
    );
  }

  deleteExistingMovimentacaoEstoque(movimento_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/movimentacao-estoque/${movimento_id}`
    );
  }
}
