import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${environment.apiurl}/usuario`);
  }

  getUsuario(usuario_id: number): Observable<Usuario> {
    return this.http.get<Usuario>(
      `${environment.apiurl}/usuario/${usuario_id}`
    );
  }

  createNewUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(`${environment.apiurl}/usuario`, usuario);
  }

  updateExistingUsuario(
    usuario: Usuario,
    usuario_id: number
  ): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.apiurl}/usuario/${usuario_id}`,
      usuario
    );
  }

  deleteExistingUsuario(usuario_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/usuario/${usuario_id}`
    );
  }
}
