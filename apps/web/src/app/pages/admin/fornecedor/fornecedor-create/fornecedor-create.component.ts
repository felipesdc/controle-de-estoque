import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';

@Component({
  selector: 'app-fornecedor-create',
  templateUrl: './fornecedor-create.component.html',
  styleUrls: ['./fornecedor-create.component.scss'],
})
export class FornecedorCreateComponent implements OnInit {
  fornecedorForm: UntypedFormGroup;

  constructor(
    private fornecedorService: FornecedorService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.fornecedorForm = fb.group({
      fornecedor_nome: ['', Validators.required],
      fornecedor_contato: ['', Validators.required],
      fornecedor_endereco: ['', Validators.required],
    });
  }

  get fornecedor(): Fornecedor {
    const fornecedor = this.fornecedorForm.value;
    return fornecedor;
  }

  get fornecedorFormControl() {
    return this.fornecedorForm.controls;
  }

  ngOnInit(): void {}

  createFornecedor(): void {
    this.fornecedorService
      .createNewFornecedor(this.fornecedor)
      .subscribe(() => {
        this.fornecedorService.showMessage(
          'Fornecedor criado com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'fornecedor']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'fornecedor']);
  }
}
