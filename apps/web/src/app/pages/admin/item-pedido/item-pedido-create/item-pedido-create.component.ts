import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ItemPedido } from 'src/app/shared/models/item-pedido.model';
import { Pedido } from 'src/app/shared/models/pedido.model';
import { Preco } from 'src/app/shared/models/preco.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { ItemPedidoService } from 'src/app/shared/services/item-pedido.service';
import { PedidoService } from 'src/app/shared/services/pedido.service';
import { PrecoService } from 'src/app/shared/services/preco.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-item-pedido-create',
  templateUrl: './item-pedido-create.component.html',
  styleUrls: ['./item-pedido-create.component.scss'],
})
export class ItemPedidoCreateComponent implements OnInit {
  itemPedidoForm: UntypedFormGroup;

  pedidos!: Pedido[];
  precos!: Preco[];
  unidades!: Unidade[];
  produtos!: Produto[];

  constructor(
    private itemPedidoService: ItemPedidoService,
    private pedidoService: PedidoService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeService,
    private precoService: PrecoService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.itemPedidoForm = fb.group({
      item_pedido_pedido_id: ['', Validators.required],
      item_pedido_pedido: ['', Validators.required],
      item_pedido_produto_id: ['', Validators.required],
      item_pedido_produto: ['', Validators.required],
      item_pedido_unidade_id: ['', Validators.required],
      item_pedido_unidade: ['', Validators.required],
      item_pedido_preco_id: ['', Validators.required],
      item_pedido_preco: ['', Validators.required],
      item_pedido_quantidade: ['', Validators.required],
      item_pedido_total: ['', Validators.required],
    });
  }

  get itemPedido(): ItemPedido {
    const itemPedido = this.itemPedidoForm.value;
    return itemPedido;
  }

  get itemPedidoFormControl() {
    return this.itemPedidoForm.controls;
  }

  ngOnInit(): void {
    forkJoin({
      pedidos: this.pedidoService.getPedidos(),
      precos: this.precoService.getPrecos(),
      unidades: this.unidadeService.getUnidades(),
      produtos: this.produtoService.getProdutos(),
    }).subscribe({
      next: ({ pedidos, precos, unidades, produtos }) => {
        this.pedidos = pedidos;
        this.precos = precos;
        this.unidades = unidades;
        this.produtos = produtos;
      },
      error: (error) => {
        console.error('Erro ao carregar dados iniciais:', error);
      },
    });
  }

  createItemPedido(): void {
    this.itemPedidoService
      .createNewItemPedido(this.itemPedido)
      .subscribe(() => {
        this.itemPedidoService.showMessage(
          'Item de Pedido criado com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'item-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'item-pedido']);
  }

  alteraDescricaoDoPedido(pedido_id: number) {
    this.itemPedidoForm.controls['item_pedido_pedido'].setValue(
      this.pedidos.find((pedido) => pedido.pedido_id === pedido_id).pedido_data
    );
  }

  alteraDescricaoDaUnidade(unidade_id: number) {
    this.itemPedidoForm.controls['item_pedido_unidade'].setValue(
      this.unidades.find((unidade) => unidade.unidade_id === unidade_id)
        .unidade_descricao
    );
  }

  alteraValorDoPreco(preco_id: number) {
    this.itemPedidoForm.controls['item_pedido_preco'].setValue(
      this.precos.find((preco) => preco.preco_id === preco_id).preco_compra
    );
  }

  alteraDescricaoDoProduto(produto_id: number) {
    this.itemPedidoForm.controls['item_pedido_produto'].setValue(
      this.produtos.find((produto) => produto.produto_id === produto_id)
        .produto_descricao
    );
  }
}
