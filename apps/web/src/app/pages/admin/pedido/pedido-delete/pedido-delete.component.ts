import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadoPedido } from 'src/app/shared/models/estado-pedido.model';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { Usuario } from 'src/app/shared/models/usuario.model';
import { EstadoPedidoService } from 'src/app/shared/services/estado-pedido.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { PedidoService } from 'src/app/shared/services/pedido.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-pedido-delete',
  templateUrl: './pedido-delete.component.html',
  styleUrls: ['./pedido-delete.component.scss'],
})
export class PedidoDeleteComponent implements OnInit {
  pedido_id: number;

  pedidoForm: UntypedFormGroup;

  fornecedores!: Fornecedor[];
  usuarios!: Usuario[];
  estadosPedido!: EstadoPedido[];

  get pedidoFormControl() {
    return this.pedidoForm.controls;
  }

  constructor(
    private pedidoService: PedidoService,
    private fornecedorService: FornecedorService,
    private usuarioService: UsuarioService,
    private estadoPedidoService: EstadoPedidoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.pedidoForm = fb.group({
      pedido_id: ['', Validators.required],
      pedido_fornecedor_id: ['', Validators.required],
      pedido_fornecedor: ['', Validators.required],
      pedido_data: ['', Validators.required],
      pedido_usuario_id: ['', Validators.required],
      pedido_usuario: ['', Validators.required],
      pedido_estado_id: ['', Validators.required],
      pedido_estado: ['', Validators.required],
      pedido_observacao: ['', Validators.required],
      pedido_total: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.pedido_id = +this.route.snapshot.paramMap.get('pedido_id');
    this.pedidoForm.controls['pedido_id'].setValue(this.pedido_id);
    this.fornecedorService.getFornecedores().subscribe({
      next: (fornecedores) => (this.fornecedores = fornecedores),
      complete: () => {
        this.estadoPedidoService.getEstadosPedido().subscribe({
          next: (estadosPedido) => (this.estadosPedido = estadosPedido),
          complete: () => {
            this.usuarioService.getUsuarios().subscribe({
              next: (usuarios) => (this.usuarios = usuarios),
              complete: () => {
                this.carregaPedido();
              },
            });
          },
        });
      },
    });
  }

  carregaPedido(): void {
    this.pedidoService.getPedido(this.pedido_id).subscribe((pedido) => {
      console.log(pedido);
      this.pedidoForm.controls['pedido_fornecedor_id'].setValue(
        pedido.pedido_fornecedor_id
      );
      this.pedidoForm.controls['pedido_fornecedor'].setValue(
        pedido.pedido_fornecedor
      );
      this.pedidoForm.controls['pedido_data'].setValue(pedido.pedido_data);
      this.pedidoForm.controls['pedido_usuario_id'].setValue(
        pedido.pedido_usuario_id
      );
      this.pedidoForm.controls['pedido_usuario'].setValue(
        pedido.pedido_usuario
      );
      this.pedidoForm.controls['pedido_estado_id'].setValue(
        pedido.pedido_estado_id
      );
      this.pedidoForm.controls['pedido_estado'].setValue(pedido.pedido_estado);
      this.pedidoForm.controls['pedido_observacao'].setValue(
        pedido.pedido_observacao
      );
      this.pedidoForm.controls['pedido_total'].setValue(pedido.pedido_total);
    });
  }

  deletePedido(): void {
    this.pedidoService
      .deleteExistingPedido(this.pedido_id)
      .subscribe((pedido) => {
        this.pedidoService.showMessage(
          'Pedido excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'pedido']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'pedido']);
  }
}
