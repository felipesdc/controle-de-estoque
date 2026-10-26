import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadoPedidoService } from 'src/app/shared/services/estado-pedido.service';

@Component({
  selector: 'app-estado-pedido-delete',
  templateUrl: './estado-pedido-delete.component.html',
  styleUrls: ['./estado-pedido-delete.component.scss'],
})
export class EstadoPedidoDeleteComponent implements OnInit {
  estado_pedido_id: number;

  estadoPedidoForm: UntypedFormGroup;

  get estadoPedidoFormControl() {
    return this.estadoPedidoForm.controls;
  }

  constructor(
    private estadoPedidoService: EstadoPedidoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.estadoPedidoForm = fb.group({
      estado_pedido_id: ['', Validators.required],
      estado_pedido_descricao: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.estado_pedido_id =
      +this.route.snapshot.paramMap.get('estado_pedido_id');
    this.estadoPedidoForm.controls['estado_pedido_id'].setValue(
      this.estado_pedido_id
    );
    this.estadoPedidoService
      .getEstadoPedido(this.estado_pedido_id)
      .subscribe((estadoPedido) => {
        this.estadoPedidoForm.controls['estado_pedido_descricao'].setValue(
          estadoPedido.estado_pedido_descricao
        );
      });
  }

  deleteEstadoPedido(): void {
    this.estadoPedidoService
      .deleteExistingEstadoPedido(this.estado_pedido_id)
      .subscribe((estadoPedido) => {
        this.estadoPedidoService.showMessage(
          'Estado de Pedido excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'estado-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'estado-pedido']);
  }
}
