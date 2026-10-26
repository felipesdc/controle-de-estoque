import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoPedido } from 'src/app/shared/models/estado-pedido.model';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { Pedido } from 'src/app/shared/models/pedido.model';
import { Usuario } from 'src/app/shared/models/usuario.model';
import { EstadoPedidoService } from 'src/app/shared/services/estado-pedido.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { PedidoService } from 'src/app/shared/services/pedido.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-pedido-create',
  templateUrl: './pedido-create.component.html',
  styleUrls: ['./pedido-create.component.scss'],
})
export class PedidoCreateComponent implements OnInit {
  pedidoForm: UntypedFormGroup;

  fornecedores!: Fornecedor[];
  usuarios!: Usuario[];
  estadosPedido!: EstadoPedido[];

  constructor(
    private pedidoService: PedidoService,
    private fornecedorService: FornecedorService,
    private usuarioService: UsuarioService,
    private estadoPedidoService: EstadoPedidoService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.pedidoForm = fb.group({
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

  get pedido(): Pedido {
    const pedido = this.pedidoForm.value;
    return pedido;
  }

  get pedidoFormControl() {
    return this.pedidoForm.controls;
  }

  ngOnInit(): void {
    this.fornecedorService.getFornecedores().subscribe({
      next: (fornecedores) => (this.fornecedores = fornecedores),
      complete: () => {
        this.estadoPedidoService.getEstadosPedido().subscribe({
          next: (estadosPedido) => (this.estadosPedido = estadosPedido),
          complete: () => {
            this.usuarioService.getUsuarios().subscribe({
              next: (usuarios) => (this.usuarios = usuarios),
            });
          },
        });
      },
    });
  }

  createPedido(): void {
    this.pedidoService.createNewPedido(this.pedido).subscribe(() => {
      this.pedidoService.showMessage('Pedido criado com sucesso!', 'backsnack');
      this.router.navigate(['admin', 'pedido']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'pedido']);
  }

  alteraNomeDoFornecedor(fornecedor_id: number) {
    this.pedidoForm.controls['pedido_fornecedor'].setValue(
      this.fornecedores.find(
        (fornecedor) => fornecedor.fornecedor_id === fornecedor_id
      ).fornecedor_nome
    );
  }

  alteraNomeDoUsuario(usuario_id: number) {
    this.pedidoForm.controls['pedido_usuario'].setValue(
      this.usuarios.find((usuario) => usuario.usuario_id === usuario_id)
        .usuario_nome
    );
  }

  alteraDescricaoDoEstadoPedido(estado_pedido_id: number) {
    this.pedidoForm.controls['pedido_estado'].setValue(
      this.estadosPedido.find(
        (estadoPedido) => estadoPedido.estado_pedido_id === estado_pedido_id
      ).estado_pedido_descricao
    );
  }
}
