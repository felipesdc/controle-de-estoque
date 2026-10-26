import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Unidade } from '../models/unidade.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UnidadeService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getUnidades(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(`${environment.apiurl}/unidade`);
  }

  getUnidade(unidade_id: number): Observable<Unidade> {
    return this.http.get<Unidade>(
      `${environment.apiurl}/unidade/${unidade_id}`
    );
  }

  createNewUnidade(unidade: Unidade): Observable<Unidade> {
    return this.http.post<Unidade>(`${environment.apiurl}/unidade`, unidade);
  }

  updateExistingUnidade(
    unidade: Unidade,
    unidade_id: number
  ): Observable<Unidade> {
    return this.http.put<Unidade>(
      `${environment.apiurl}/unidade/${unidade_id}`,
      unidade
    );
  }

  deleteExistingUnidade(unidade_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/unidade/${unidade_id}`
    );
  }
}
