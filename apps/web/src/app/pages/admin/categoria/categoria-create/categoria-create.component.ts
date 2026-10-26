import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';

@Component({
  selector: 'app-categoria-create',
  templateUrl: './categoria-create.component.html',
  styleUrls: ['./categoria-create.component.scss'],
})
export class CategoriaCreateComponent implements OnInit {
  categoriaForm: UntypedFormGroup;

  constructor(
    private categoriaService: CategoriaService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.categoriaForm = fb.group({
      categoria_descricao: ['', Validators.required],
    });
  }

  get categoria(): Categoria {
    const categoria = this.categoriaForm.value;
    return categoria;
  }

  get categoriaFormControl() {
    return this.categoriaForm.controls;
  }

  ngOnInit(): void {}

  createCategoria(): void {
    this.categoriaService.createNewCategoria(this.categoria).subscribe(() => {
      this.categoriaService.showMessage(
        'Categoria criada com sucesso!',
        'backsnack'
      );
      this.router.navigate(['admin', 'categoria']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'categoria']);
  }
}
