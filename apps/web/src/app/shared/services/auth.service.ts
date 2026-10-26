import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { environment } from 'src/environments/environment';
import { TokenPayload } from '../interfaces/token-payload.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private snack: MatSnackBar,
    private router: Router,
    private http: HttpClient
  ) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  login(usuario_login: string, usuario_password: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.http
        .post<{ token: string; user: { role: string } }>(
          `${environment.apiurl}/usuario/login`,
          {
            usuario_login: usuario_login,
            usuario_password: usuario_password,
          }
        )
        .subscribe({
          next: (response) => {
            localStorage.setItem('token', response.token);
            this.isAuthenticated.next(true);

            // Decodifica o token
            const decoded = jwtDecode<TokenPayload>(response.token);

            // Redireciona para a home
            this.router.navigate(['/home']);

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            this.showMessage('Usuário ou senha inválidos', 'msg-error');
            this.isAuthenticated.next(false);
            observer.next(false);
            observer.complete();
          },
        });
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.isAuthenticated.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAdmin(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.usuario_perfil_id === 1;
    } catch (error) {
      return false;
    }
  }

  isGerente(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.usuario_perfil_id === 2;
    } catch (error) {
      return false;
    }
  }

  isFuncionario() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.usuario_perfil_id !== 1 && decoded.usuario_perfil_id !== 2;
    } catch (error) {
      return false;
    }
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }
}
