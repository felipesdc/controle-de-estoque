import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Perfil } from '../models/perfil.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getPerfis(): Observable<Perfil[]> {
    return this.http.get<Perfil[]>(`${environment.apiurl}/perfil`);
  }

  getPerfil(perfil_id: number): Observable<Perfil> {
    return this.http.get<Perfil>(`${environment.apiurl}/perfil/${perfil_id}`);
  }

  createNewPerfil(perfil: Perfil): Observable<Perfil> {
    return this.http.post<Perfil>(`${environment.apiurl}/perfil`, perfil);
  }

  updateExistingPerfil(perfil: Perfil, perfil_id: number): Observable<Perfil> {
    return this.http.put<Perfil>(
      `${environment.apiurl}/perfil/${perfil_id}`,
      perfil
    );
  }

  deleteExistingPerfil(perfil_id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiurl}/perfil/${perfil_id}`);
  }
}
