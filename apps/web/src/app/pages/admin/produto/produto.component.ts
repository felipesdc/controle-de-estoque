import {
  AfterContentInit,
  AfterViewInit,
  Component,
  OnInit,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { Preco } from 'src/app/shared/models/preco.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { PrecoService } from 'src/app/shared/services/preco.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-crud-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.scss'],
})
export class ProdutoComponent implements OnInit {
  produtos!: Produto[];

  fornecedores!: Fornecedor[];
  precos!: Preco[];
  unidades!: Unidade[];
  categorias!: Categoria[];

  cargaCompleta: boolean = false;

  displayedColumns = [
    'produto_id',
    'produto_descricao',
    'produto_fornecedor',
    'produto_preco',
    'produto_unidade',
    'produto_categoria',
    'produto_quantidade_estoque',
    'produto_data_validade',
    'produto_codigo_barras',
    'produto_estado',
    'produto_action',
  ];

  constructor(
    private produtoService: ProdutoService,
    private fornecedorService: FornecedorService,
    private precoService: PrecoService,
    private unidadeService: UnidadeService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    forkJoin({
      fornecedores: this.fornecedorService.getFornecedores(),
      precos: this.precoService.getPrecos(),
      unidades: this.unidadeService.getUnidades(),
      categorias: this.categoriaService.getCategorias(),
    }).subscribe({
      next: ({ fornecedores, precos, unidades, categorias }) => {
        this.fornecedores = fornecedores;
        this.precos = precos;
        this.unidades = unidades;
        this.categorias = categorias;
        this.carregaProdutos();
      },
      error: (err) => console.error('Erro ao carregar dados:', err),
    });
  }

  carregaProdutos(): void {
    this.produtoService.getProdutos().subscribe((produtos) => {
      this.produtos = produtos.map((produto) => {
        let produto_fornecedor = produto.produto_fornecedor_id
          ? this.fornecedores.find(
              (fornecedor) =>
                fornecedor.fornecedor_id === produto.produto_fornecedor_id
            ).fornecedor_nome
          : '';
        let produto_preco = produto.produto_preco_id
          ? this.precos.find(
              (preco) => preco.preco_id === produto.produto_preco_id
            ).preco_compra
          : '';
        let produto_unidade = produto.produto_unidade_id
          ? this.unidades.find(
              (unidade) => unidade.unidade_id === produto.produto_unidade_id
            ).unidade_descricao
          : '';
        let produto_categoria = this.categorias.find(
          (categoria) => categoria.categoria_id === produto.produto_categoria_id
        ).categoria_descricao;
        return {
          ...produto,
          produto_fornecedor,
          produto_preco,
          produto_unidade,
          produto_categoria,
        };
      });
    });
  }
}
