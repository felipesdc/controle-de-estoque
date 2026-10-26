import { Component, OnInit } from '@angular/core';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { UnidadeService } from 'src/app/shared/services/unidade.service';

@Component({
  selector: 'app-crud-unidade',
  templateUrl: './unidade.component.html',
  styleUrls: ['./unidade.component.scss'],
})
export class UnidadeComponent implements OnInit {
  unidades!: Unidade[];

  displayedColumns = ['unidade_id', 'unidade_descricao', 'unidade_action'];

  constructor(private unidadeService: UnidadeService) {}

  ngOnInit(): void {
    this.unidadeService.getUnidades().subscribe((unidades) => {
      this.unidades = unidades;
    });
  }
}
