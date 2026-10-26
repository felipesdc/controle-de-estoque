import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Fornecedor } from '../models/fornecedor.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FornecedorService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getFornecedores(): Observable<Fornecedor[]> {
    return this.http.get<Fornecedor[]>(`${environment.apiurl}/fornecedor`);
  }

  getFornecedor(fornecedor_id: number): Observable<Fornecedor> {
    return this.http.get<Fornecedor>(
      `${environment.apiurl}/fornecedor/${fornecedor_id}`
    );
  }

  createNewFornecedor(fornecedor: Fornecedor): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(
      `${environment.apiurl}/fornecedor`,
      fornecedor
    );
  }

  updateExistingFornecedor(
    fornecedor: Fornecedor,
    fornecedor_id: number
  ): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(
      `${environment.apiurl}/fornecedor/${fornecedor_id}`,
      fornecedor
    );
  }

  deleteExistingFornecedor(fornecedor_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/fornecedor/${fornecedor_id}`
    );
  }
}
