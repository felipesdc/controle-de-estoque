import {NgModule} from '@angular/core';
import {RouterModule,Routes} from '@angular/router';
import {AdminComponent} from './admin.component';
import {AcessosComponent} from './acessos/acessos.component';
const children:Routes=[
 {path:'acessos',redirectTo:'acessos/usuarios',pathMatch:'full'},
 {path:'acessos/:aba',component:AcessosComponent},
 {path:'produto/create',redirectTo:'/home/produtos?novo=1',pathMatch:'full'},
 {path:'produto/update/:produto_id',redirectTo:({params})=>'/home/produtos?editar='+encodeURIComponent(params['produto_id'])},
 {path:'produto/delete/:produto_id',redirectTo:({params})=>'/home/produtos?situacao='+encodeURIComponent(params['produto_id'])},
 {path:'produto',redirectTo:'/home/produtos',pathMatch:'full'},
];
children.push({"path": "categoria", "redirectTo": "/home/cadastros/categorias", "pathMatch": "full"});
children.push({"path": "categoria/create", "redirectTo": "/home/cadastros/categorias", "pathMatch": "full"});
children.push({"path": "categoria/update/:id", "redirectTo": "/home/cadastros/categorias", "pathMatch": "full"});
children.push({"path": "categoria/delete/:id", "redirectTo": "/home/cadastros/categorias", "pathMatch": "full"});
children.push({"path": "unidade", "redirectTo": "/home/cadastros/unidades", "pathMatch": "full"});
children.push({"path": "unidade/create", "redirectTo": "/home/cadastros/unidades", "pathMatch": "full"});
children.push({"path": "unidade/update/:id", "redirectTo": "/home/cadastros/unidades", "pathMatch": "full"});
children.push({"path": "unidade/delete/:id", "redirectTo": "/home/cadastros/unidades", "pathMatch": "full"});
children.push({"path": "fornecedor", "redirectTo": "/home/cadastros/fornecedores", "pathMatch": "full"});
children.push({"path": "fornecedor/create", "redirectTo": "/home/cadastros/fornecedores", "pathMatch": "full"});
children.push({"path": "fornecedor/update/:id", "redirectTo": "/home/cadastros/fornecedores", "pathMatch": "full"});
children.push({"path": "fornecedor/delete/:id", "redirectTo": "/home/cadastros/fornecedores", "pathMatch": "full"});
children.push({"path": "perfil", "redirectTo": "/admin/acessos/perfis", "pathMatch": "full"});
children.push({"path": "perfil/create", "redirectTo": "/admin/acessos/perfis", "pathMatch": "full"});
children.push({"path": "perfil/update/:id", "redirectTo": "/admin/acessos/perfis", "pathMatch": "full"});
children.push({"path": "perfil/delete/:id", "redirectTo": "/admin/acessos/perfis", "pathMatch": "full"});
children.push({"path": "usuario", "redirectTo": "/admin/acessos/usuarios", "pathMatch": "full"});
children.push({"path": "usuario/create", "redirectTo": "/admin/acessos/usuarios", "pathMatch": "full"});
children.push({"path": "usuario/update/:id", "redirectTo": "/admin/acessos/usuarios", "pathMatch": "full"});
children.push({"path": "usuario/delete/:id", "redirectTo": "/admin/acessos/usuarios", "pathMatch": "full"});
children.push({"path": "preco", "redirectTo": "/home/produtos?precos=1", "pathMatch": "full"});
children.push({"path": "preco/create", "redirectTo": "/home/produtos?precos=1", "pathMatch": "full"});
children.push({"path": "preco/update/:id", "redirectTo": "/home/produtos?precos=1", "pathMatch": "full"});
children.push({"path": "preco/delete/:id", "redirectTo": "/home/produtos?precos=1", "pathMatch": "full"});
children.push({"path": "pedido", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "pedido/create", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "pedido/update/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "pedido/delete/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "estado-pedido", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "estado-pedido/create", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "estado-pedido/update/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "estado-pedido/delete/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "historico-estado-pedido", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "historico-estado-pedido/create", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "historico-estado-pedido/update/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "historico-estado-pedido/delete/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "item-pedido", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "item-pedido/create", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "item-pedido/update/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "item-pedido/delete/:id", "redirectTo": "/home/pedidos", "pathMatch": "full"});
children.push({"path": "movimentacao-estoque", "redirectTo": "/home/movimentacoes", "pathMatch": "full"});
children.push({"path": "movimentacao-estoque/create", "redirectTo": "/home/movimentacoes", "pathMatch": "full"});
children.push({"path": "movimentacao-estoque/update/:id", "redirectTo": "/home/movimentacoes", "pathMatch": "full"});
children.push({"path": "movimentacao-estoque/delete/:id", "redirectTo": "/home/movimentacoes", "pathMatch": "full"});
const routes:Routes=[{path:'',component:AdminComponent,children}];
@NgModule({imports:[RouterModule.forChild(routes)],exports:[RouterModule]})
export class AdminRoutingModule {}
