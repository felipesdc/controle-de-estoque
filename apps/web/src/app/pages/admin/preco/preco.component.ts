import { Component, OnInit } from '@angular/core';
import { Preco } from 'src/app/shared/models/preco.model';
import { PrecoService } from 'src/app/shared/services/preco.service';
import extractLocaleDate from 'src/app/shared/helpers/extract-locale-date';

@Component({
  selector: 'app-crud-preco',
  templateUrl: './preco.component.html',
  styleUrls: ['./preco.component.scss'],
})
export class PrecoComponent implements OnInit {
  precos!: Preco[];

  displayedColumns = [
    'preco_id',
    'preco_compra',
    'preco_venda',
    'preco_data_inicial',
    'preco_data_final',
    'preco_action',
  ];

  constructor(private precoService: PrecoService) {}

  ngOnInit(): void {
    this.precoService.getPrecos().subscribe((precos) => {
      this.precos = precos.map((preco: Preco) => {
        let precoSemTratamento = preco;
        let preco_data_inicial = extractLocaleDate(
          precoSemTratamento.preco_data_inicial.toString() || ''
        );
        let preco_data_final: string;
        if (
          precoSemTratamento.preco_data_final === null ||
          precoSemTratamento.preco_data_final === ''
        ) {
          preco_data_final = null;
        } else {
          preco_data_final = extractLocaleDate(
            precoSemTratamento.preco_data_final.toString() || ''
          );
        }
        return { ...precoSemTratamento, preco_data_inicial, preco_data_final };
      });
    });
  }
}
