import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HistoricoEstadoPedido } from 'src/app/shared/models/historico-estado-pedido.model';
import { HistoricoEstadoPedidoService } from 'src/app/shared/services/historico-estado-pedido.service';

@Component({
  selector: 'app-historico-estado-pedido-create',
  templateUrl: './historico-estado-pedido-create.component.html',
  styleUrls: ['./historico-estado-pedido-create.component.scss'],
})
export class HistoricoEstadoPedidoCreateComponent implements OnInit {
  historicoForm: UntypedFormGroup;

  constructor(
    private historicoEstadoPedidoService: HistoricoEstadoPedidoService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.historicoForm = fb.group({
      historico_pedido_id: ['', Validators.required],
      historico_estado_id: ['', Validators.required],
      historico_data: ['', Validators.required],
      historico_usuario_id: ['', Validators.required],
      historico_observacao: ['', Validators.required],
    });
  }

  get historicoEstadoPedido(): HistoricoEstadoPedido {
    const historicoEstadoPedido = this.historicoForm.value;
    return historicoEstadoPedido;
  }

  get historicoFormControl() {
    return this.historicoForm.controls;
  }

  ngOnInit(): void {}

  createHistoricoEstadoPedido(): void {
    this.historicoEstadoPedidoService
      .createNewHistoricoEstadoPedido(this.historicoEstadoPedido)
      .subscribe(() => {
        this.historicoEstadoPedidoService.showMessage(
          'Histórico Estado Pedido criada com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'historico-estado-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'historico-estado-pedido']);
  }
}
