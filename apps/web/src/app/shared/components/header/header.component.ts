import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SidenavService } from '../../services/sidenav.service';
import { AuthService } from '../../services/auth.service';
@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  constructor(public nav: SidenavService, public auth: AuthService, private router: Router) {}
  get titulo(): string {
    const url = this.router.url;
    if (url.startsWith('/admin')) return 'Administração';
    if (url.includes('/operar')) return 'Operar estoque';
    if (url.includes('/relatorios')) return 'Relatórios';
    if (url.includes('/pedidos')) return 'Pedidos';
    if (url.includes('/cadastros')) return 'Cadastros';
    if (url.includes('/produtos')) return 'Produtos';
    if (url.includes('/movimentacoes')) return 'Movimentações';
    return 'Visão geral';
  }
  get perfil(): string { return this.auth.isAdmin() ? 'Administrador' : this.auth.isGerente() ? 'Gerente' : this.auth.podeOperarEstoque() ? 'Funcionário' : 'Consulta'; }
}
