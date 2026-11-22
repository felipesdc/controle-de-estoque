import {ReembolsosCreditoComponent} from './pedidos/reembolsos-credito.component';
import {SeletorFiltroComponent} from 'src/app/shared/components/seletor-filtro/seletor-filtro.component';
import {SeletorCadastroComponent} from 'src/app/shared/components/seletor-cadastro/seletor-cadastro.component';
import { AlertasLotesComponent } from './lotes/alertas-lotes.component';
import { CustosComponent } from './relatorios/custos.component';
import { LotesComponent } from './lotes/lotes.component';
import { RelatoriosPeriodoComponent } from './relatorios/relatorios-periodo.component';
import { InventariosComponent } from './inventarios/inventarios.component';
import { ReposicaoComponent } from './reposicao/reposicao.component';
import { OperarEstoqueComponent } from './movimentacoes/operar-estoque.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { ProdutoStatusDialogComponent } from './produtos/produto-status-dialog.component';
import { CadastrosComponent } from './cadastros/cadastros.component';
import { CadastroDialogComponent } from './cadastros/cadastro-dialog.component';
import { SeletorLoteComponent } from './lotes/seletor-lote.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { HomeRoutingModule } from './home-routing.module';
import { MaterialModule } from 'src/app/shared/material/material.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FornecedoresComponent } from './fornecedores/fornecedores.component';
import { MovimentacoesComponent } from './movimentacoes/movimentacoes.component';
import { ProdutosComponent } from './produtos/produtos.component';
import { RelatoriosComponent } from './relatorios/relatorios.component';
import { ProdutosCreateDialogComponent } from './produtos/produtos-create-dialog/produtos-create-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    SeletorCadastroComponent,
    SeletorFiltroComponent,
    ReembolsosCreditoComponent,
    HomeRoutingModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [
    HomeComponent,
    LotesComponent,
    AlertasLotesComponent,
    SeletorLoteComponent,
    OperarEstoqueComponent,
    PedidosComponent,
    ReposicaoComponent,
    InventariosComponent,
    CadastrosComponent,
    CadastroDialogComponent,
    DashboardComponent,
    FornecedoresComponent,
    MovimentacoesComponent,
    ProdutosComponent,
    ProdutoStatusDialogComponent,
    ProdutosCreateDialogComponent,
    RelatoriosComponent,
    RelatoriosPeriodoComponent,
    CustosComponent,
  ],
})
export class HomeModule {}
