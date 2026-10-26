import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { ProdutosCreateDialogComponent } from './produtos-create-dialog/produtos-create-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { Produto } from 'src/app/shared/models/produto.model';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-produtos',
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.scss'],
})
export class ProdutosComponent implements OnInit, AfterViewInit {
  produtos: Produto[];
  categorias: Categoria[];

  dataSource: MatTableDataSource<Produto>;

  displayedColumns: string[] = [
    'id',
    'descricao',
    'categoria',
    'quantidade',
    'acoes',
  ];

  // produtos = [
  //   {
  //     produto_id: 1,
  //     produto_descricao: 'Hamburguer',
  //     categoria_nome: 'Lanches',
  //     produto_quantidade: 50,
  //   },
  //   {
  //     produto_id: 2,
  //     produto_descricao: 'Batata Frita',
  //     categoria_nome: 'Acompanhamentos',
  //     produto_quantidade: 3,
  //   },
  //   {
  //     produto_id: 3,
  //     produto_descricao: 'Refrigerante',
  //     categoria_nome: 'Bebidas',
  //     produto_quantidade: 20,
  //   },
  // ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private produtoService: ProdutoService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    this.loadProdutos();
  }

  ngAfterViewInit() {}

  loadProdutos(): void {
    forkJoin({
      produtos: this.produtoService.getProdutos(),
      categorias: this.categoriaService.getCategorias(),
    }).subscribe(({ produtos, categorias }) => {
      this.produtos = produtos.filter((produto) => produto.produto_estado);
      this.categorias = categorias;

      // Adiciona o nome da categoria a cada produto
      this.produtos.forEach((produto) => {
        const categoria = categorias.find(
          (c) => c.categoria_id === produto.produto_categoria_id
        );
        produto.produto_categoria = categoria
          ? categoria.categoria_descricao
          : 'Sem categoria';
      });

      this.dataSource = new MatTableDataSource(this.produtos);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  onAddProduto() {
    const dialogRef = this.dialog.open(ProdutosCreateDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((novoProduto) => {
      if (novoProduto) {
        this.produtoService
          .createNewProduto(novoProduto)
          .subscribe({ next: () => this.loadProdutos(), error: err => this.produtoService.showMessage(err.error?.message || 'Não foi possível cadastrar o produto.', 'msg-error') });
      }
    });
  }

  onEditProduto(produtoId: number): void {
    const produto = this.produtos.find((p) => p.produto_id === produtoId);

    if (!produto) return;

    const dialogRef = this.dialog.open(ProdutosCreateDialogComponent, {
      width: '400px',
      data: { ...produto }, // já inclui produto_descricao e categoria_nome
    });

    dialogRef.afterClosed().subscribe((produtoEditado) => {
      if (produtoEditado) {
        this.produtoService
          .updateExistingProduto(produtoEditado, produtoId)
          .subscribe({ next: () => this.loadProdutos(), error: err => this.produtoService.showMessage(err.error?.message || 'Não foi possível atualizar o produto.', 'msg-error') });
      }
    });
  }

  onDeleteProduto(produtoId: number): void {
    this.produtoService.getProduto(produtoId).subscribe((produto) => {
      const produtoAtualizado = {
        ...produto,
        produto_estado: false,

      };

      this.produtoService
        .updateExistingProduto(produtoAtualizado, produtoId)
        .subscribe({ next: () => this.loadProdutos(), error: err => this.produtoService.showMessage(err.error?.message || 'Não foi possível inativar o produto.', 'msg-error') });
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}
