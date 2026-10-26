import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { Preco } from 'src/app/shared/models/preco.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { PrecoService } from 'src/app/shared/services/preco.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-produto-update',
  templateUrl: './produto-update.component.html',
  styleUrls: ['./produto-update.component.scss'],
})
export class ProdutoUpdateComponent implements OnInit {
  produto_id: number;

  produtoForm: UntypedFormGroup;

  fornecedores!: Fornecedor[];
  precos!: Preco[];
  unidades!: Unidade[];
  categorias!: Categoria[];

  get produtoFormControl() {
    return this.produtoForm.controls;
  }

  constructor(
    private produtoService: ProdutoService,
    private fornecedorService: FornecedorService,
    private precoService: PrecoService,
    private unidadeService: UnidadeService,
    private categoriaService: CategoriaService,
    private fb: UntypedFormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.produtoForm = fb.group({
      produto_id: ['', Validators.required],
      produto_descricao: ['', Validators.required],
      produto_fornecedor_id: ['', Validators.required],
      produto_fornecedor: ['', Validators.required],
      produto_preco_id: ['', Validators.required],
      produto_preco: ['', Validators.required],
      produto_unidade_id: ['', Validators.required],
      produto_unidade: ['', Validators.required],
      produto_categoria_id: ['', Validators.required],
      produto_categoria: ['', Validators.required],
      produto_quantidade_estoque: ['', Validators.required],
      produto_data_validade: ['', Validators.required],
      produto_codigo_barras: ['', Validators.required],
      produto_estado: ['', Validators.required],
    });
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
        this.carregaProduto();
      },
      error: (error) => {
        console.error('Erro ao carregar dados iniciais:', error);
      },
    });
  }

  ngOnInit(): void {
    this.produto_id = +this.route.snapshot.paramMap.get('produto_id');
    this.produtoForm.controls['produto_id'].setValue(this.produto_id);
  }

  carregaProduto(): void {
    this.produtoService.getProduto(this.produto_id).subscribe((produto) => {
      this.produtoForm.controls['produto_descricao'].setValue(
        produto.produto_descricao
      );
      this.produtoForm.controls['produto_fornecedor_id'].setValue(
        produto.produto_fornecedor_id
      );
      this.produtoForm.controls['produto_fornecedor'].setValue(
        produto.produto_fornecedor_id
          ? this.fornecedores.find(
              (fornecedor) =>
                fornecedor.fornecedor_id === produto.produto_fornecedor_id
            ).fornecedor_nome
          : ''
      );
      this.produtoForm.controls['produto_preco_id'].setValue(
        produto.produto_preco_id
      );
      this.produtoForm.controls['produto_preco'].setValue(
        produto.produto_preco_id
          ? this.precos.find(
              (preco) => preco.preco_id === produto.produto_preco_id
            ).preco_compra
          : ''
      );
      this.produtoForm.controls['produto_unidade_id'].setValue(
        produto.produto_unidade_id
      );
      this.produtoForm.controls['produto_unidade'].setValue(
        produto.produto_unidade_id
          ? this.unidades.find(
              (unidade) => unidade.unidade_id === produto.produto_unidade_id
            ).unidade_descricao
          : ''
      );
      this.produtoForm.controls['produto_categoria_id'].setValue(
        produto.produto_categoria_id
      );
      this.produtoForm.controls['produto_categoria'].setValue(
        produto.produto_categoria_id
          ? this.categorias.find(
              (categorias) =>
                categorias.categoria_id === produto.produto_categoria_id
            ).categoria_descricao
          : ''
      );
      this.produtoForm.controls['produto_quantidade_estoque'].setValue(
        produto.produto_quantidade_estoque
      );
      this.produtoForm.controls['produto_data_validade'].setValue(
        produto.produto_data_validade
      );
      this.produtoForm.controls['produto_codigo_barras'].setValue(
        produto.produto_codigo_barras
      );
      this.produtoForm.controls['produto_estado'].setValue(
        produto.produto_estado ? produto.produto_estado.toString() : ''
      );
    });
  }

  updateProduto(): void {
    this.produtoService
      .updateExistingProduto(this.produtoForm.value, this.produto_id)
      .subscribe((produto) => {
        this.produtoService.showMessage(
          'Produto atualizado com sucesso!',
          'backsnack'
        );
        this.router.navigate(['/admin', 'produto']);
      });
  }

  cancel(): void {
    this.router.navigate(['/admin', 'produto']);
  }

  alteraNomeDoFornecedor(fornecedor_id: number) {
    this.produtoForm.controls['produto_fornecedor'].setValue(
      this.fornecedores.find(
        (fornecedor) => fornecedor.fornecedor_id === fornecedor_id
      ).fornecedor_nome
    );
  }

  alteraValorDoPreco(preco_id: number) {
    this.produtoForm.controls['produto_preco'].setValue(
      this.precos.find((preco) => preco.preco_id === preco_id).preco_compra
    );
  }

  alteraDescricaoDaUnidade(unidade_id: number) {
    this.produtoForm.controls['produto_unidade'].setValue(
      this.unidades.find((unidade) => unidade.unidade_id === unidade_id)
        .unidade_descricao
    );
  }

  alteraDescricaoDaCategoria(categoria_id: number) {
    this.produtoForm.controls['produto_categoria'].setValue(
      this.categorias.find(
        (categoria) => categoria.categoria_id === categoria_id
      ).categoria_descricao
    );
  }
}
