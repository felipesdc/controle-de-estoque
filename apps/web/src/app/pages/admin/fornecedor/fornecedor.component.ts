import { Component, OnInit } from '@angular/core';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';

@Component({
  selector: 'app-crud-fornecedor',
  templateUrl: './fornecedor.component.html',
  styleUrls: ['./fornecedor.component.scss'],
})
export class FornecedorComponent implements OnInit {
  fornecedores!: Fornecedor[];

  displayedColumns = [
    'fornecedor_id',
    'fornecedor_nome',
    'fornecedor_contato',
    'fornecedor_endereco',
    'fornecedor_action',
  ];

  constructor(private fornecedorService: FornecedorService) {}

  ngOnInit(): void {
    this.fornecedorService.getFornecedores().subscribe((fornecedores) => {
      this.fornecedores = fornecedores;
    });
  }
}
