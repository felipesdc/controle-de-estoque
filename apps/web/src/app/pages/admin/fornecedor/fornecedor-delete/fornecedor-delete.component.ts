import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';

@Component({
  selector: 'app-fornecedor-delete',
  templateUrl: './fornecedor-delete.component.html',
  styleUrls: ['./fornecedor-delete.component.scss'],
})
export class FornecedorDeleteComponent implements OnInit {
  fornecedor_id: number;

  fornecedorForm: UntypedFormGroup;

  get fornecedorFormControl() {
    return this.fornecedorForm.controls;
  }

  constructor(
    private fornecedorService: FornecedorService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.fornecedorForm = fb.group({
      fornecedor_id: ['', Validators.required],
      fornecedor_nome: ['', Validators.required],
      fornecedor_contato: ['', Validators.required],
      fornecedor_endereco: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fornecedor_id = +this.route.snapshot.paramMap.get('fornecedor_id');
    this.fornecedorForm.controls['fornecedor_id'].setValue(this.fornecedor_id);
    this.fornecedorService
      .getFornecedor(this.fornecedor_id)
      .subscribe((fornecedor) => {
        this.fornecedorForm.controls['fornecedor_nome'].setValue(
          fornecedor.fornecedor_nome
        );
        this.fornecedorForm.controls['fornecedor_contato'].setValue(
          fornecedor.fornecedor_contato
        );
        this.fornecedorForm.controls['fornecedor_endereco'].setValue(
          fornecedor.fornecedor_endereco
        );
      });
  }

  deleteFornecedor(): void {
    this.fornecedorService
      .deleteExistingFornecedor(this.fornecedor_id)
      .subscribe((fornecedor) => {
        this.fornecedorService.showMessage(
          'Fornecedor excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'fornecedor']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'fornecedor']);
  }
}
