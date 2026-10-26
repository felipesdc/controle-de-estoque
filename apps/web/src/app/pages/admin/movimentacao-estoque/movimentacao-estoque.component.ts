import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MovimentacaoEstoque } from 'src/app/shared/models/movimentacao-estoque.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { Usuario } from 'src/app/shared/models/usuario.model';
import { MovimentacaoEstoqueService } from 'src/app/shared/services/movimentacao-estoque.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-crud-movimentacao-estoque',
  templateUrl: './movimentacao-estoque.component.html',
  styleUrls: ['./movimentacao-estoque.component.scss'],
})
export class MovimentacaoEstoqueComponent implements OnInit {
  movimentacoesEstoque!: MovimentacaoEstoque[];
  produtos!: Produto[];
  usuarios!: Usuario[];

  displayedColumns = [
    'movimento_id',
    'movimento_produto',
    'movimento_quantidade',
    'movimento_tipo',
    'movimento_data',
    'movimento_observacao',
    'movimento_action',
  ];

  constructor(
    private movimentacaoEstoqueService: MovimentacaoEstoqueService,
    private produtoService: ProdutoService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    forkJoin({
      movimentacoesEstoque:
        this.movimentacaoEstoqueService.getMovimentacoesEstoque(),
      produtos: this.produtoService.getProdutos(),
      usuarios: this.usuarioService.getUsuarios(),
    }).subscribe({
      next: ({ movimentacoesEstoque, produtos, usuarios }) => {
        this.movimentacoesEstoque = movimentacoesEstoque;
        this.produtos = produtos;
        this.usuarios = usuarios;
        this.carregaMovimentacoesEstoque();
      },
      error: (err) => console.error('Erro ao carregar dados:', err),
    });
  }

  carregaMovimentacoesEstoque(): void {
    this.movimentacaoEstoqueService
      .getMovimentacoesEstoque()
      .subscribe((movimentacoesEstoque) => {
        this.movimentacoesEstoque = movimentacoesEstoque.map(
          (movimentacaoEstoque) => {
            let movimento_produto = this.produtos.find(
              (produto) =>
                produto.produto_id === movimentacaoEstoque.movimento_produto_id
            ).produto_descricao;

            return {
              ...movimentacaoEstoque,
              movimento_produto,
            };
          }
        );
      });
  }
}
