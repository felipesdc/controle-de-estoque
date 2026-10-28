import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({ selector: 'app-admin', templateUrl: './admin.component.html', styleUrl: './admin.component.scss' })
export class AdminComponent {
  constructor(private router: Router) {}
  get inicio(): boolean { return this.router.url.split('?')[0] === '/admin'; }
  secoes = [
    { titulo: 'Operação do estoque', texto: 'Catálogo, saldos e histórico de entradas e saídas.', links: [{nome:'Produtos',url:'/home/produtos',icone:'inventory_2'},{nome:'Movimentações',url:'/home/movimentacoes',icone:'swap_horiz'}] },
    { titulo: 'Cadastros auxiliares', texto: 'Organize as informações usadas nos produtos e pedidos.', links: [{nome:'Categorias',url:'/home/cadastros/categorias',icone:'category'},{nome:'Unidades',url:'/home/cadastros/unidades',icone:'straighten'},{nome:'Fornecedores',url:'/home/cadastros/fornecedores',icone:'local_shipping'}] },
    { titulo: 'Acesso ao sistema', texto: 'Gerencie usuários e perfis de acesso.', links: [{nome:'Usuários',url:'/admin/acessos/usuarios',icone:'people_outline'},{nome:'Perfis',url:'/admin/acessos/perfis',icone:'manage_accounts'}] },
    { titulo: 'Pedidos e valores', texto: 'Compras com recebimento integrado ao estoque e cadastro legado de preços.', links: [{nome:'Pedidos',url:'/home/pedidos',icone:'receipt_long'},{nome:'Preços',url:'/admin/preco',icone:'payments'}] },
  ];
}
