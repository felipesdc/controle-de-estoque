import { LotesComponent } from './lotes/lotes.component';
import { RelatoriosPeriodoComponent } from './relatorios/relatorios-periodo.component';
import { InventariosComponent } from './inventarios/inventarios.component';
import { ReposicaoComponent } from './reposicao/reposicao.component';
import { OperarEstoqueComponent } from './movimentacoes/operar-estoque.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CadastrosComponent } from './cadastros/cadastros.component';
import { HomeComponent } from './home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProdutosComponent } from './produtos/produtos.component';
import { MovimentacoesComponent } from './movimentacoes/movimentacoes.component';
import { FornecedoresComponent } from './fornecedores/fornecedores.component';
import { RelatoriosComponent } from './relatorios/relatorios.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'lotes', component: LotesComponent },
      { path: 'produtos', component: ProdutosComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'reposicao', component: ReposicaoComponent },
      { path: 'inventarios', component: InventariosComponent },
      { path: 'operar', component: OperarEstoqueComponent },
      { path: 'movimentacoes', component: MovimentacoesComponent },
      { path: 'cadastros', redirectTo: 'cadastros/categorias', pathMatch: 'full' },
      { path: 'cadastros/:tipo', component: CadastrosComponent },
      { path: 'fornecedores', redirectTo: 'cadastros/fornecedores', pathMatch: 'full' },
      { path: 'relatorios', component: RelatoriosComponent, pathMatch:'full' },
      { path: 'relatorios/consumo', component: RelatoriosPeriodoComponent, data:{tipo:'consumo'} },
      { path: 'relatorios/compras', component: RelatoriosPeriodoComponent, data:{tipo:'compras'} },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
