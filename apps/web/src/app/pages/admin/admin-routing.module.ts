import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AcessosComponent } from './acessos/acessos.component';
import { AdminComponent } from './admin.component';

import { ProdutoComponent } from './produto/produto.component';
import { ProdutoCreateComponent } from './produto/produto-create/produto-create.component';
import { ProdutoDeleteComponent } from './produto/produto-delete/produto-delete.component';
import { ProdutoUpdateComponent } from './produto/produto-update/produto-update.component';

import { PedidoComponent } from './pedido/pedido.component';
import { PedidoCreateComponent } from './pedido/pedido-create/pedido-create.component';
import { PedidoDeleteComponent } from './pedido/pedido-delete/pedido-delete.component';
import { PedidoUpdateComponent } from './pedido/pedido-update/pedido-update.component';

import { CategoriaComponent } from './categoria/categoria.component';
import { CategoriaCreateComponent } from './categoria/categoria-create/categoria-create.component';
import { CategoriaDeleteComponent } from './categoria/categoria-delete/categoria-delete.component';
import { CategoriaUpdateComponent } from './categoria/categoria-update/categoria-update.component';

import { EstadoPedidoComponent } from './estado-pedido/estado-pedido.component';
import { EstadoPedidoCreateComponent } from './estado-pedido/estado-pedido-create/estado-pedido-create.component';
import { EstadoPedidoDeleteComponent } from './estado-pedido/estado-pedido-delete/estado-pedido-delete.component';
import { EstadoPedidoUpdateComponent } from './estado-pedido/estado-pedido-update/estado-pedido-update.component';

import { FornecedorComponent } from './fornecedor/fornecedor.component';
import { FornecedorCreateComponent } from './fornecedor/fornecedor-create/fornecedor-create.component';
import { FornecedorDeleteComponent } from './fornecedor/fornecedor-delete/fornecedor-delete.component';
import { FornecedorUpdateComponent } from './fornecedor/fornecedor-update/fornecedor-update.component';

import { HistoricoEstadoPedidoComponent } from './historico-estado-pedido/historico-estado-pedido.component';
import { HistoricoEstadoPedidoCreateComponent } from './historico-estado-pedido/historico-estado-pedido-create/historico-estado-pedido-create.component';
import { HistoricoEstadoPedidoDeleteComponent } from './historico-estado-pedido/historico-estado-pedido-delete/historico-estado-pedido-delete.component';
import { HistoricoEstadoPedidoUpdateComponent } from './historico-estado-pedido/historico-estado-pedido-update/historico-estado-pedido-update.component';

import { ItemPedidoComponent } from './item-pedido/item-pedido.component';
import { ItemPedidoCreateComponent } from './item-pedido/item-pedido-create/item-pedido-create.component';
import { ItemPedidoDeleteComponent } from './item-pedido/item-pedido-delete/item-pedido-delete.component';
import { ItemPedidoUpdateComponent } from './item-pedido/item-pedido-update/item-pedido-update.component';

import { MovimentacaoEstoqueComponent } from './movimentacao-estoque/movimentacao-estoque.component';
import { MovimentacaoEstoqueCreateComponent } from './movimentacao-estoque/movimentacao-estoque-create/movimentacao-estoque-create.component';
import { MovimentacaoEstoqueDeleteComponent } from './movimentacao-estoque/movimentacao-estoque-delete/movimentacao-estoque-delete.component';
import { MovimentacaoEstoqueUpdateComponent } from './movimentacao-estoque/movimentacao-estoque-update/movimentacao-estoque-update.component';

import { PerfilComponent } from './perfil/perfil.component';
import { PerfilCreateComponent } from './perfil/perfil-create/perfil-create.component';
import { PerfilDeleteComponent } from './perfil/perfil-delete/perfil-delete.component';
import { PerfilUpdateComponent } from './perfil/perfil-update/perfil-update.component';

import { PrecoComponent } from './preco/preco.component';
import { PrecoCreateComponent } from './preco/preco-create/preco-create.component';
import { PrecoDeleteComponent } from './preco/preco-delete/preco-delete.component';
import { PrecoUpdateComponent } from './preco/preco-update/preco-update.component';

import { UnidadeComponent } from './unidade/unidade.component';
import { UnidadeCreateComponent } from './unidade/unidade-create/unidade-create.component';
import { UnidadeDeleteComponent } from './unidade/unidade-delete/unidade-delete.component';
import { UnidadeUpdateComponent } from './unidade/unidade-update/unidade-update.component';

import { UsuarioComponent } from './usuario/usuario.component';
import { UsuarioCreateComponent } from './usuario/usuario-create/usuario-create.component';
import { UsuarioDeleteComponent } from './usuario/usuario-delete/usuario-delete.component';
import { UsuarioUpdateComponent } from './usuario/usuario-update/usuario-update.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'acessos', redirectTo: 'acessos/usuarios', pathMatch: 'full' },
      { path: 'acessos/:aba', component: AcessosComponent },
      { path: 'produto/create', component: ProdutoCreateComponent },
      { path: 'produto/delete/:produto_id', component: ProdutoDeleteComponent },
      {
        path: 'produto/update/:produto_id',
        component: ProdutoUpdateComponent,
      },
      { path: 'produto', component: ProdutoComponent },
      { path: 'pedido/create', redirectTo: '/home/pedidos', pathMatch: 'full', },
      { path: 'pedido/delete/:pedido_id', redirectTo: '/home/pedidos', pathMatch: 'full', },
      { path: 'pedido/update/:pedido_id', redirectTo: '/home/pedidos', pathMatch: 'full', },
      { path: 'pedido', redirectTo: '/home/pedidos', pathMatch: 'full', },
      { path: 'categoria/create', redirectTo: '/home/cadastros/categorias', pathMatch: 'full', },
      {
        path: 'categoria/delete/:categoria_id', redirectTo: '/home/cadastros/categorias', pathMatch: 'full',
      },
      {
        path: 'categoria/update/:categoria_id', redirectTo: '/home/cadastros/categorias', pathMatch: 'full',
      },
      { path: 'categoria', redirectTo: '/home/cadastros/categorias', pathMatch: 'full', },
      { path: 'estado-pedido/create', redirectTo: '/home/pedidos', pathMatch: 'full', },
      {
        path: 'estado-pedido/delete/:estado_pedido_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      {
        path: 'estado-pedido/update/:estado_pedido_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      { path: 'estado-pedido', redirectTo: '/home/pedidos', pathMatch: 'full', },
      { path: 'fornecedor/create', redirectTo: '/home/cadastros/fornecedores', pathMatch: 'full', },
      {
        path: 'fornecedor/delete/:fornecedor_id', redirectTo: '/home/cadastros/fornecedores', pathMatch: 'full',
      },
      {
        path: 'fornecedor/update/:fornecedor_id', redirectTo: '/home/cadastros/fornecedores', pathMatch: 'full',
      },
      { path: 'fornecedor', redirectTo: '/home/cadastros/fornecedores', pathMatch: 'full', },
      {
        path: 'historico-estado-pedido/create', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      {
        path: 'historico-estado-pedido/delete/:historico_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      {
        path: 'historico-estado-pedido/update/:historico_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      {
        path: 'historico-estado-pedido', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      { path: 'item-pedido/create', redirectTo: '/home/pedidos', pathMatch: 'full', },
      {
        path: 'item-pedido/delete/:produto_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      {
        path: 'item-pedido/update/:produto_id', redirectTo: '/home/pedidos', pathMatch: 'full',
      },
      { path: 'item-pedido', redirectTo: '/home/pedidos', pathMatch: 'full', },
      {
        path: 'movimentacao-estoque/create', redirectTo: '/home/movimentacoes', pathMatch: 'full',
      },
      {
        path: 'movimentacao-estoque/delete/:movimento_id', redirectTo: '/home/movimentacoes', pathMatch: 'full',
      },
      {
        path: 'movimentacao-estoque/update/:movimento_id', redirectTo: '/home/movimentacoes', pathMatch: 'full',
      },
      {
        path: 'movimentacao-estoque', redirectTo: '/home/movimentacoes', pathMatch: 'full',
      },
      { path: 'perfil/create', redirectTo: '/admin/acessos/perfis', pathMatch: 'full', },
      { path: 'perfil/delete/:produto_id', redirectTo: '/admin/acessos/perfis', pathMatch: 'full', },
      { path: 'perfil/update/:produto_id', redirectTo: '/admin/acessos/perfis', pathMatch: 'full', },
      { path: 'perfil', redirectTo: '/admin/acessos/perfis', pathMatch: 'full', },
      { path: 'preco/create', component: PrecoCreateComponent },
      { path: 'preco/delete/:preco_id', component: PrecoDeleteComponent },
      { path: 'preco/update/:preco_id', component: PrecoUpdateComponent },
      { path: 'preco', component: PrecoComponent },
      { path: 'unidade/create', redirectTo: '/home/cadastros/unidades', pathMatch: 'full', },
      { path: 'unidade/delete/:unidade_id', redirectTo: '/home/cadastros/unidades', pathMatch: 'full', },
      { path: 'unidade/update/:unidade_id', redirectTo: '/home/cadastros/unidades', pathMatch: 'full', },
      { path: 'unidade', redirectTo: '/home/cadastros/unidades', pathMatch: 'full', },
      { path: 'usuario/create', redirectTo: '/admin/acessos/usuarios', pathMatch: 'full', },
      { path: 'usuario/delete/:usuario_id', redirectTo: '/admin/acessos/usuarios', pathMatch: 'full', },
      { path: 'usuario/update/:usuario_id', redirectTo: '/admin/acessos/usuarios', pathMatch: 'full', },
      { path: 'usuario', redirectTo: '/admin/acessos/usuarios', pathMatch: 'full', },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
