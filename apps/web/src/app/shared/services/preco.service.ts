import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Preco } from '../models/preco.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrecoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getPrecos(): Observable<Preco[]> {
    return this.http.get<Preco[]>(`${environment.apiurl}/preco`);
  }

  getPreco(preco_id: number): Observable<Preco> {
    return this.http.get<Preco>(`${environment.apiurl}/preco/${preco_id}`);
  }

  createNewPreco(preco: Preco): Observable<Preco> {
    return this.http.post<Preco>(`${environment.apiurl}/preco`, preco);
  }

  updateExistingPreco(preco: Preco, preco_id: number): Observable<Preco> {
    return this.http.put<Preco>(
      `${environment.apiurl}/preco/${preco_id}`,
      preco
    );
  }

  deleteExistingPreco(preco_id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiurl}/preco/${preco_id}`);
  }
}
