import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../services/auth.service';
import { TokenPayload } from '../interfaces/token-payload.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = this.auth.getToken();

    if (!token) {
      return this.router.parseUrl('/login');
    }

    try {
      const decoded: TokenPayload = jwtDecode(token);
      const perfilId = decoded.usuario_perfil_id;

      if (perfilId === 1) {
        return true;
      } else {
        return this.router.parseUrl('/');
      }
    } catch (err) {
      this.auth.logout();
      return this.router.parseUrl('/login');
    }
  }
}
