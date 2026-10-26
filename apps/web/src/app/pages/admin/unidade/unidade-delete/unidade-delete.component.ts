import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-unidade-delete',
  templateUrl: './unidade-delete.component.html',
  styleUrls: ['./unidade-delete.component.scss'],
})
export class UnidadeDeleteComponent implements OnInit {
  unidade_id: number;

  unidadeForm: UntypedFormGroup;

  get unidadeFormControl() {
    return this.unidadeForm.controls;
  }

  constructor(
    private unidadeService: UnidadeService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.unidadeForm = fb.group({
      unidade_id: ['', Validators.required],
      unidade_descricao: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.unidade_id = +this.route.snapshot.paramMap.get('unidade_id');
    this.unidadeForm.controls['unidade_id'].setValue(this.unidade_id);
    this.unidadeService.getUnidade(this.unidade_id).subscribe((unidade) => {
      this.unidadeForm.controls['unidade_descricao'].setValue(
        unidade.unidade_descricao
      );
    });
  }

  deleteUnidade(): void {
    this.unidadeService
      .deleteExistingUnidade(this.unidade_id)
      .subscribe((unidade) => {
        this.unidadeService.showMessage(
          'Unidade excluída com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'unidade']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'unidade']);
  }
}
