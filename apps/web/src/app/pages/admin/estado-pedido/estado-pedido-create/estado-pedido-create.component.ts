import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoPedido } from 'src/app/shared/models/estado-pedido.model';
import { EstadoPedidoService } from 'src/app/shared/services/estado-pedido.service';

@Component({
  selector: 'app-estado-pedido-create',
  templateUrl: './estado-pedido-create.component.html',
  styleUrls: ['./estado-pedido-create.component.scss'],
})
export class EstadoPedidoCreateComponent implements OnInit {
  estadoPedidoForm: UntypedFormGroup;

  constructor(
    private estadoPedidoService: EstadoPedidoService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.estadoPedidoForm = fb.group({
      estado_pedido_descricao: ['', Validators.required],
    });
  }

  get estadoPedido(): EstadoPedido {
    const estadoPedido = this.estadoPedidoForm.value;
    return estadoPedido;
  }

  get estadoPedidoFormControl() {
    return this.estadoPedidoForm.controls;
  }

  ngOnInit(): void {}

  createEstadoPedido(): void {
    this.estadoPedidoService
      .createNewEstadoPedido(this.estadoPedido)
      .subscribe(() => {
        this.estadoPedidoService.showMessage(
          'Estado de Pedido criado com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'estado-pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'estado-pedido']);
  }
}
