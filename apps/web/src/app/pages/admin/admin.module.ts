import { LOCALE_ID, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { provideNativeDateAdapter } from '@angular/material/core';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { MaterialModule } from 'src/app/shared/material/material.module';
import { ProdutoComponent } from './produto/produto.component';
import { ProdutoCreateComponent } from './produto/produto-create/produto-create.component';
import { ProdutoUpdateComponent } from './produto/produto-update/produto-update.component';
import { ProdutoDeleteComponent } from './produto/produto-delete/produto-delete.component';
import { PedidoComponent } from './pedido/pedido.component';
import { PedidoCreateComponent } from './pedido/pedido-create/pedido-create.component';
import { PedidoUpdateComponent } from './pedido/pedido-update/pedido-update.component';
import { PedidoDeleteComponent } from './pedido/pedido-delete/pedido-delete.component';
import { CategoriaComponent } from './categoria/categoria.component';
import { CategoriaCreateComponent } from './categoria/categoria-create/categoria-create.component';
import { CategoriaUpdateComponent } from './categoria/categoria-update/categoria-update.component';
import { CategoriaDeleteComponent } from './categoria/categoria-delete/categoria-delete.component';
import { EstadoPedidoCreateComponent } from './estado-pedido/estado-pedido-create/estado-pedido-create.component';
import { EstadoPedidoUpdateComponent } from './estado-pedido/estado-pedido-update/estado-pedido-update.component';
import { EstadoPedidoComponent } from './estado-pedido/estado-pedido.component';
import { EstadoPedidoDeleteComponent } from './estado-pedido/estado-pedido-delete/estado-pedido-delete.component';
import { FornecedorCreateComponent } from './fornecedor/fornecedor-create/fornecedor-create.component';
import { FornecedorUpdateComponent } from './fornecedor/fornecedor-update/fornecedor-update.component';
import { FornecedorComponent } from './fornecedor/fornecedor.component';
import { FornecedorDeleteComponent } from './fornecedor/fornecedor-delete/fornecedor-delete.component';
import { UsuarioCreateComponent } from './usuario/usuario-create/usuario-create.component';
import { UsuarioUpdateComponent } from './usuario/usuario-update/usuario-update.component';
import { UsuarioComponent } from './usuario/usuario.component';
import { UsuarioDeleteComponent } from './usuario/usuario-delete/usuario-delete.component';
import { UnidadeCreateComponent } from './unidade/unidade-create/unidade-create.component';
import { UnidadeUpdateComponent } from './unidade/unidade-update/unidade-update.component';
import { UnidadeComponent } from './unidade/unidade.component';
import { UnidadeDeleteComponent } from './unidade/unidade-delete/unidade-delete.component';
import { PerfilCreateComponent } from './perfil/perfil-create/perfil-create.component';
import { PerfilUpdateComponent } from './perfil/perfil-update/perfil-update.component';
import { PerfilComponent } from './perfil/perfil.component';
import { PerfilDeleteComponent } from './perfil/perfil-delete/perfil-delete.component';
import { PrecoCreateComponent } from './preco/preco-create/preco-create.component';
import { PrecoUpdateComponent } from './preco/preco-update/preco-update.component';
import { PrecoComponent } from './preco/preco.component';
import { PrecoDeleteComponent } from './preco/preco-delete/preco-delete.component';
import { MovimentacaoEstoqueCreateComponent } from './movimentacao-estoque/movimentacao-estoque-create/movimentacao-estoque-create.component';
import { MovimentacaoEstoqueUpdateComponent } from './movimentacao-estoque/movimentacao-estoque-update/movimentacao-estoque-update.component';
import { MovimentacaoEstoqueComponent } from './movimentacao-estoque/movimentacao-estoque.component';
import { MovimentacaoEstoqueDeleteComponent } from './movimentacao-estoque/movimentacao-estoque-delete/movimentacao-estoque-delete.component';
import { ItemPedidoCreateComponent } from './item-pedido/item-pedido-create/item-pedido-create.component';
import { ItemPedidoUpdateComponent } from './item-pedido/item-pedido-update/item-pedido-update.component';
import { ItemPedidoComponent } from './item-pedido/item-pedido.component';
import { ItemPedidoDeleteComponent } from './item-pedido/item-pedido-delete/item-pedido-delete.component';
import { HistoricoEstadoPedidoCreateComponent } from './historico-estado-pedido/historico-estado-pedido-create/historico-estado-pedido-create.component';
import { HistoricoEstadoPedidoUpdateComponent } from './historico-estado-pedido/historico-estado-pedido-update/historico-estado-pedido-update.component';
import { HistoricoEstadoPedidoComponent } from './historico-estado-pedido/historico-estado-pedido.component';
import { HistoricoEstadoPedidoDeleteComponent } from './historico-estado-pedido/historico-estado-pedido-delete/historico-estado-pedido-delete.component';

@NgModule({
  imports: [
    CommonModule,
    AdminRoutingModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyMaskModule,
  ],
  declarations: [
    AdminComponent,
    ProdutoCreateComponent,
    ProdutoUpdateComponent,
    ProdutoComponent,
    ProdutoDeleteComponent,
    PedidoCreateComponent,
    PedidoUpdateComponent,
    PedidoComponent,
    PedidoDeleteComponent,
    CategoriaCreateComponent,
    CategoriaUpdateComponent,
    CategoriaComponent,
    CategoriaDeleteComponent,
    EstadoPedidoCreateComponent,
    EstadoPedidoUpdateComponent,
    EstadoPedidoComponent,
    EstadoPedidoDeleteComponent,
    FornecedorCreateComponent,
    FornecedorUpdateComponent,
    FornecedorComponent,
    FornecedorDeleteComponent,
    UsuarioCreateComponent,
    UsuarioUpdateComponent,
    UsuarioComponent,
    UsuarioDeleteComponent,
    UnidadeCreateComponent,
    UnidadeUpdateComponent,
    UnidadeComponent,
    UnidadeDeleteComponent,
    PerfilCreateComponent,
    PerfilUpdateComponent,
    PerfilComponent,
    PerfilDeleteComponent,
    PrecoCreateComponent,
    PrecoUpdateComponent,
    PrecoComponent,
    PrecoDeleteComponent,
    MovimentacaoEstoqueCreateComponent,
    MovimentacaoEstoqueUpdateComponent,
    MovimentacaoEstoqueComponent,
    MovimentacaoEstoqueDeleteComponent,
    ItemPedidoCreateComponent,
    ItemPedidoUpdateComponent,
    ItemPedidoComponent,
    ItemPedidoDeleteComponent,
    HistoricoEstadoPedidoCreateComponent,
    HistoricoEstadoPedidoUpdateComponent,
    HistoricoEstadoPedidoComponent,
    HistoricoEstadoPedidoDeleteComponent,
  ],
  exports: [
    AdminComponent,
    ProdutoCreateComponent,
    ProdutoUpdateComponent,
    ProdutoComponent,
    ProdutoDeleteComponent,
    PedidoCreateComponent,
    PedidoUpdateComponent,
    PedidoComponent,
    PedidoDeleteComponent,
    CategoriaCreateComponent,
    CategoriaUpdateComponent,
    CategoriaComponent,
    CategoriaDeleteComponent,
    EstadoPedidoCreateComponent,
    EstadoPedidoUpdateComponent,
    EstadoPedidoComponent,
    EstadoPedidoDeleteComponent,
    FornecedorCreateComponent,
    FornecedorUpdateComponent,
    FornecedorComponent,
    FornecedorDeleteComponent,
    UsuarioCreateComponent,
    UsuarioUpdateComponent,
    UsuarioComponent,
    UsuarioDeleteComponent,
    UnidadeCreateComponent,
    UnidadeUpdateComponent,
    UnidadeComponent,
    UnidadeDeleteComponent,
    PerfilCreateComponent,
    PerfilUpdateComponent,
    PerfilComponent,
    PerfilDeleteComponent,
    PrecoCreateComponent,
    PrecoUpdateComponent,
    PrecoComponent,
    PrecoDeleteComponent,
    MovimentacaoEstoqueCreateComponent,
    MovimentacaoEstoqueUpdateComponent,
    MovimentacaoEstoqueComponent,
    MovimentacaoEstoqueDeleteComponent,
    ItemPedidoCreateComponent,
    ItemPedidoUpdateComponent,
    ItemPedidoComponent,
    ItemPedidoDeleteComponent,
    HistoricoEstadoPedidoCreateComponent,
    HistoricoEstadoPedidoUpdateComponent,
    HistoricoEstadoPedidoComponent,
    HistoricoEstadoPedidoDeleteComponent,
  ],
  providers: [
    provideNativeDateAdapter(),
    {
      provide: LOCALE_ID,
      useValue: 'pt-br',
    },
  ],
})
export class AdminModule {}
