import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Produto } from 'src/app/shared/models/produto.model';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';

@Component({
  selector: 'app-produtos-create-dialog',
  templateUrl: './produtos-create-dialog.component.html',
  styleUrls: ['./produtos-create-dialog.component.scss'],
})
export class ProdutosCreateDialogComponent implements OnInit {
  produtoForm: FormGroup;
  categorias: Categoria[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProdutosCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Produto,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    this.categoriaService.getCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });
    this.produtoForm = this.fb.group({
      produto_descricao: [
        this.data?.produto_descricao || '',
        Validators.required,
      ],
      produto_quantidade_estoque: [
        this.data?.produto_quantidade_estoque || 0,
        [Validators.required, Validators.min(0), Validators.max(1e9)],
      ],
      produto_categoria_id: [this.data?.produto_categoria_id || ''],
      produto_data_validade: [String(this.data?.produto_data_validade || '').slice(0, 10)],
    });
  }

  onSave() {
    if (this.produtoForm.valid) {
      const formValue = this.produtoForm.getRawValue();

      const produto = {
        ...this.data,
        produto_descricao: formValue.produto_descricao,
        produto_quantidade_estoque: formValue.produto_quantidade_estoque,
        produto_categoria_id: formValue.produto_categoria_id,
        produto_data_validade: formValue.produto_data_validade || null,
        produto_estado: true,
      };

      this.dialogRef.close(produto);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
