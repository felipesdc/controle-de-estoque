import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaService } from 'src/app/shared/services/categoria.service';

@Component({
  selector: 'app-categoria-update',
  templateUrl: './categoria-update.component.html',
  styleUrls: ['./categoria-update.component.scss'],
})
export class CategoriaUpdateComponent implements OnInit {
  categoria_id: number;

  categoriaForm: UntypedFormGroup;

  get categoriaFormControl() {
    return this.categoriaForm.controls;
  }

  constructor(
    private categoriaService: CategoriaService,
    private fb: UntypedFormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.categoriaForm = fb.group({
      categoria_id: ['', Validators.required],
      categoria_descricao: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.categoria_id = +this.route.snapshot.paramMap.get('categoria_id');
    this.categoriaForm.controls['categoria_id'].setValue(this.categoria_id);
    this.categoriaService
      .getCategoria(this.categoria_id)
      .subscribe((categoria) => {
        this.categoriaForm.controls['categoria_descricao'].setValue(
          categoria.categoria_descricao
        );
      });
  }

  updateCategoria(): void {
    this.categoriaService
      .updateExistingCategoria(this.categoriaForm.value, this.categoria_id)
      .subscribe((categoria) => {
        this.categoriaService.showMessage(
          'Categoria atualizada com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'categoria']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'categoria']);
  }
}
