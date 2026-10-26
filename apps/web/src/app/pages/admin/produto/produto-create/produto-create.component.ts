import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
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
  selector: 'app-produto-create',
  templateUrl: './produto-create.component.html',
  styleUrls: ['./produto-create.component.scss'],
})
export class ProdutoCreateComponent implements OnInit {
  produtoForm: UntypedFormGroup;

  fornecedores!: Fornecedor[];
  precos!: Preco[];
  unidades!: Unidade[];
  categorias!: Categoria[];

  constructor(
    private produtoService: ProdutoService,
    private fornecedorService: FornecedorService,
    private precoService: PrecoService,
    private unidadeService: UnidadeService,
    private categoriaService: CategoriaService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.produtoForm = fb.group({
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
  }

  get produto(): Produto {
    const produto = this.produtoForm.value;
    return produto;
  }

  get produtoFormControl() {
    return this.produtoForm.controls;
  }

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
      },
      error: (error) => {
        console.error('Erro ao carregar dados iniciais:', error);
      },
    });
  }

  createProduto(): void {
    this.produtoService.createNewProduto(this.produto).subscribe(() => {
      this.produtoService.showMessage(
        'Produto criado com sucesso!',
        'backsnack'
      );
      this.router.navigate(['admin', 'produto']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'produto']);
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
