import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-unidade-create',
  templateUrl: './unidade-create.component.html',
  styleUrls: ['./unidade-create.component.scss'],
})
export class UnidadeCreateComponent implements OnInit {
  unidadeForm: UntypedFormGroup;

  constructor(
    private unidadeService: UnidadeService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.unidadeForm = fb.group({
      unidade_descricao: ['', Validators.required],
    });
  }

  get unidade(): Unidade {
    const unidade = this.unidadeForm.value;
    return unidade;
  }

  get unidadeFormControl() {
    return this.unidadeForm.controls;
  }

  ngOnInit(): void {}

  createUnidade(): void {
    this.unidadeService.createNewUnidade(this.unidade).subscribe(() => {
      this.unidadeService.showMessage(
        'Unidade criada com sucesso!',
        'backsnack'
      );
      this.router.navigate(['admin', 'unidade']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'unidade']);
  }
}
