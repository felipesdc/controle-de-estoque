import { Component, OnInit } from '@angular/core';
import { HistoricoEstadoPedido } from 'src/app/shared/models/historico-estado-pedido.model';
import { HistoricoEstadoPedidoService } from 'src/app/shared/services/historico-estado-pedido.service';

@Component({
  selector: 'app-crud-historico-estado-pedido',
  templateUrl: './historico-estado-pedido.component.html',
  styleUrls: ['./historico-estado-pedido.component.scss'],
})
export class HistoricoEstadoPedidoComponent implements OnInit {
  historicos!: HistoricoEstadoPedido[];

  displayedColumns = [
    'historico_id',
    'historico_pedido_id',
    'historico_estado_id',
    'historico_data',
    'historico_usuario_id',
    'historico_observacao',
    'historico_action',
  ];

  constructor(
    private historicoEstadoPedidoService: HistoricoEstadoPedidoService
  ) {}

  ngOnInit(): void {
    this.historicoEstadoPedidoService
      .getHistoricosEstadoPedido()
      .subscribe((historicos) => {
        this.historicos = historicos;
      });
  }
}
