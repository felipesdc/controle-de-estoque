import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Produto } from '../models/produto.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getProdutos(): Observable<Produto[]> {
    return this.http.get<Produto[]>(`${environment.apiurl}/produto`);
  }

  getProduto(produto_id: number): Observable<Produto> {
    return this.http.get<Produto>(
      `${environment.apiurl}/produto/${produto_id}`
    );
  }

  createNewProduto(produto: Produto): Observable<Produto> {
    return this.http.post<Produto>(`${environment.apiurl}/produto`, produto);
  }

  updateExistingProduto(
    produto: Produto,
    produto_id: number
  ): Observable<Produto> {
    return this.http.put<Produto>(
      `${environment.apiurl}/produto/${produto_id}`,
      produto
    );
  }

  deleteExistingProduto(produto_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/produto/${produto_id}`
    );
  }
}
