import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoricoEstadoPedidoService } from 'src/app/shared/services/historico-estado-pedido.service';

@Component({
  selector: 'app-historico-estado-pedido-delete',
  templateUrl: './historico-estado-pedido-delete.component.html',
  styleUrls: ['./historico-estado-pedido-delete.component.scss'],
})
export class HistoricoEstadoPedidoDeleteComponent implements OnInit {
  historico_id: number;

  historicoForm: UntypedFormGroup;

  get historicoFormControl() {
    return this.historicoForm.controls;
  }

  constructor(
    private historicoEstadoPedidoService: HistoricoEstadoPedidoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.historicoForm = fb.group({
      historico_id: ['', Validators.required],
      historico_pedido_id: ['', Validators.required],
      historico_estado_id: ['', Validators.required],
      historico_data: ['', Validators.required],
      historico_usuario_id: ['', Validators.required],
      historico_observacao: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.historico_id = +this.route.snapshot.paramMap.get('historico_id');
    this.historicoForm.controls['historico_id'].setValue(this.historico_id);
    this.historicoEstadoPedidoService
      .getHistoricoEstadoPedido(this.historico_id)
      .subscribe((historicoEstadoPedido) => {
        this.historicoForm.controls['historico_pedido_id'].setValue(
          historicoEstadoPedido.historico_pedido_id
        );
        this.historicoForm.controls['historico_estado_id'].setValue(
          historicoEstadoPedido.historico_pedido_id
        );
        this.historicoForm.controls['historico_data'].setValue(
          historicoEstadoPedido.historico_pedido_id
        );
        this.historicoForm.controls['historico_usuario_id'].setValue(
          historicoEstadoPedido.historico_pedido_id
        );
        this.historicoForm.controls['historico_observacao'].setValue(
          historicoEstadoPedido.historico_pedido_id
        );
      });
  }

  deleteHistoricoEstadoPedido(): void {
    this.historicoEstadoPedidoService
      .deleteExistingHistoricoEstadoPedido(this.historico_id)
      .subscribe((historicoEstadoPedido) => {
        this.historicoEstadoPedidoService.showMessage(
          'Histórico de Estado do Pedido excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'historico-estado-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'historico-estado-pedido']);
  }
}
