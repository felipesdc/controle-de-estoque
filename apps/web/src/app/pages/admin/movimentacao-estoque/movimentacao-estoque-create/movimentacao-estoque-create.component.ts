import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MovimentacaoEstoque } from 'src/app/shared/models/movimentacao-estoque.model';
import { MovimentacaoEstoqueService } from 'src/app/shared/services/movimentacao-estoque.service';

@Component({
  selector: 'app-movimentacao-estoque-create',
  templateUrl: './movimentacao-estoque-create.component.html',
  styleUrls: ['./movimentacao-estoque-create.component.scss'],
})
export class MovimentacaoEstoqueCreateComponent implements OnInit {
  movimentacaoEstoqueForm: UntypedFormGroup;

  constructor(
    private movimentacaoEstoqueService: MovimentacaoEstoqueService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.movimentacaoEstoqueForm = fb.group({
      movimento_produto_id: ['', Validators.required],
      movimento_produto: ['', Validators.required],
      movimento_quantidade: ['', Validators.required],
      movimento_tipo: ['', Validators.required],
      movimento_data: ['', Validators.required],
      movimento_observacao: ['', Validators.required],
    });
  }

  get movimentacaoEstoque(): MovimentacaoEstoque {
    const movimentacaoEstoque = this.movimentacaoEstoqueForm.value;
    return movimentacaoEstoque;
  }

  get movimentacaoEstoqueFormControl() {
    return this.movimentacaoEstoqueForm.controls;
  }

  ngOnInit(): void {}

  createMovimentacaoEstoque(): void {
    this.movimentacaoEstoqueService
      .createNewMovimentacaoEstoque(this.movimentacaoEstoque)
      .subscribe(() => {
        this.movimentacaoEstoqueService.showMessage(
          'Movimentação de Estoque criada com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'movimentacao-estoque']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'movimentacao-estoque']);
  }
}
