import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Categoria } from '../models/categoria.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${environment.apiurl}/categoria`);
  }

  getCategoria(categoria_id: number): Observable<Categoria> {
    return this.http.get<Categoria>(
      `${environment.apiurl}/categoria/${categoria_id}`
    );
  }

  createNewCategoria(categoria: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>(
      `${environment.apiurl}/categoria`,
      categoria
    );
  }

  updateExistingCategoria(
    categoria: Categoria,
    categoria_id: number
  ): Observable<Categoria> {
    return this.http.put<Categoria>(
      `${environment.apiurl}/categoria/${categoria_id}`,
      categoria
    );
  }

  deleteExistingCategoria(categoria_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/categoria/${categoria_id}`
    );
  }
}
