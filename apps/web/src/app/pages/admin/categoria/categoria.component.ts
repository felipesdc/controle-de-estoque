import { Component, OnInit } from '@angular/core';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';

@Component({
  selector: 'app-crud-categoria',
  templateUrl: './categoria.component.html',
  styleUrls: ['./categoria.component.scss'],
})
export class CategoriaComponent implements OnInit {
  categorias!: Categoria[];

  displayedColumns = [
    'categoria_id',
    'categoria_descricao',
    'categoria_action',
  ];

  constructor(private categoriaService: CategoriaService) {}

  ngOnInit(): void {
    this.categoriaService.getCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });
  }
}
