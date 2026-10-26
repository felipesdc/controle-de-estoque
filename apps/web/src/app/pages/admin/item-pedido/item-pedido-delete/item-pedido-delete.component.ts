import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemPedidoService } from 'src/app/shared/services/item-pedido.service';

@Component({
  selector: 'app-item-pedido-delete',
  templateUrl: './item-pedido-delete.component.html',
  styleUrls: ['./item-pedido-delete.component.scss'],
})
export class ItemPedidoDeleteComponent implements OnInit {
  item_pedido_id: number;

  itemPedidoForm: UntypedFormGroup;

  get itemPedidoFormControl() {
    return this.itemPedidoForm.controls;
  }

  constructor(
    private itemPedidoService: ItemPedidoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.itemPedidoForm = fb.group({
      item_pedido_id: ['', Validators.required],
      item_pedido_pedido_id: ['', Validators.required],
      item_pedido_produto_id: ['', Validators.required],
      item_pedido_unidade_id: ['', Validators.required],
      item_pedido_preco_id: ['', Validators.required],
      item_pedido_quantidade: ['', Validators.required],
      item_pedido_total: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.item_pedido_id = +this.route.snapshot.paramMap.get('item_pedido_id');
    this.itemPedidoForm.controls['item_pedido_id'].setValue(
      this.item_pedido_id
    );
    this.itemPedidoService
      .getItemPedido(this.item_pedido_id)
      .subscribe((itemPedido) => {
        this.itemPedidoForm.controls['item_pedido_pedido_id'].setValue(
          itemPedido.item_pedido_pedido_id
        );
        this.itemPedidoForm.controls['item_pedido_produto_id'].setValue(
          itemPedido.item_pedido_produto_id
        );
        this.itemPedidoForm.controls['item_pedido_unidade_id'].setValue(
          itemPedido.item_pedido_unidade_id
        );
        this.itemPedidoForm.controls['item_pedido_preco_id'].setValue(
          itemPedido.item_pedido_preco_id
        );
        this.itemPedidoForm.controls['item_pedido_quantidade'].setValue(
          itemPedido.item_pedido_quantidade
        );
        this.itemPedidoForm.controls['item_pedido_total'].setValue(
          itemPedido.item_pedido_total
        );
      });
  }

  deleteItemPedido(): void {
    this.itemPedidoService
      .deleteExistingItemPedido(this.item_pedido_id)
      .subscribe((itemPedido) => {
        this.itemPedidoService.showMessage(
          'Item de Pedido excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'item-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'item-pedido']);
  }
}
