import { MatPaginatorIntl } from '@angular/material/paginator';
import { PaginacaoPt } from './shared/services/paginacao-pt';
import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeLayoutComponent } from './shared/layouts/home-layout/home-layout.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';
import { MaterialModule } from './shared/material/material.module';
import { SidenavComponent } from './shared/components/sidenav/sidenav.component';
import { CurrencyMaskModule } from 'ng2-currency-mask';

import { ProdutoService } from './shared/services/produto.service';
import { PedidoService } from './shared/services/pedido.service';
import { CategoriaService } from './shared/services/categoria.service';
import { EstadoPedidoService } from './shared/services/estado-pedido.service';
import { FornecedorService } from './shared/services/fornecedor.service';
import { UsuarioService } from './shared/services/usuario.service';
import { UnidadeService } from './shared/services/unidade.service';
import { PerfilService } from './shared/services/perfil.service';
import { PrecoService } from './shared/services/preco.service';
import { MovimentacaoEstoqueService } from './shared/services/movimentacao-estoque.service';
import { ItemPedidoService } from './shared/services/item-pedido.service';
import { HistoricoEstadoPedidoService } from './shared/services/historico-estado-pedido.service';

import { AuthService } from './shared/services/auth.service';
import { AuthGuard } from './shared/guards/auth.guard';
import { LoginModule } from './pages/login/login.module';
import { SidenavService } from './shared/services/sidenav.service';
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthInterceptor } from './shared/interceptors/auth.interceptor';
import { AdminLayoutComponent } from './shared/layouts/admin-layout/admin-layout.component';

registerLocaleData(localePt);

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SidenavComponent,
    HomeLayoutComponent,
    AdminLayoutComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    CurrencyMaskModule,
    LoginModule,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: PaginacaoPt },
    CategoriaService,
    EstadoPedidoService,
    FornecedorService,
    HistoricoEstadoPedidoService,
    ItemPedidoService,
    MovimentacaoEstoqueService,
    PedidoService,
    PerfilService,
    PrecoService,
    ProdutoService,
    UnidadeService,
    UsuarioService,
    AuthService,
    AuthGuard,
    AdminGuard,
    SidenavService,
    provideNativeDateAdapter(),
    {
      provide: LOCALE_ID,
      useValue: 'pt-br',
    },
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
})
export class AppModule {}
