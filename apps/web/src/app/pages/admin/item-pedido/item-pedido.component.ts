import { Component, OnInit } from '@angular/core';
import { ItemPedido } from 'src/app/shared/models/item-pedido.model';
import { ItemPedidoService } from 'src/app/shared/services/item-pedido.service';

@Component({
  selector: 'app-crud-item-pedido',
  templateUrl: './item-pedido.component.html',
  styleUrls: ['./item-pedido.component.scss'],
})
export class ItemPedidoComponent implements OnInit {
  itensPedido!: ItemPedido[];

  displayedColumns = [
    'item_pedido_id',
    'item_pedido_pedido_id',
    'item_pedido_produto',
    'item_pedido_unidade',
    'item_pedido_preco',
    'item_pedido_quantidade',
    'item_pedido_total',
    'item_pedido_action',
  ];

  constructor(private itemPedidoService: ItemPedidoService) {}

  ngOnInit(): void {
    this.itemPedidoService.getItensPedido().subscribe((itensPedido) => {
      this.itensPedido = itensPedido;
    });
  }
}
