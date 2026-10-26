import { Component, OnInit } from '@angular/core';
import { EstadoPedido } from 'src/app/shared/models/estado-pedido.model';
import { EstadoPedidoService } from 'src/app/shared/services/estado-pedido.service';

@Component({
  selector: 'app-crud-estado-pedido',
  templateUrl: './estado-pedido.component.html',
  styleUrls: ['./estado-pedido.component.scss'],
})
export class EstadoPedidoComponent implements OnInit {
  estados_pedido!: EstadoPedido[];

  displayedColumns = [
    'estado_pedido_id',
    'estado_pedido_descricao',
    'estado_pedido_action',
  ];

  constructor(private estadoPedidoService: EstadoPedidoService) {}

  ngOnInit(): void {
    this.estadoPedidoService.getEstadosPedido().subscribe((estados_pedido) => {
      this.estados_pedido = estados_pedido;
    });
  }
}
