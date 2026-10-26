import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import extractLocaleDate from 'src/app/shared/helpers/extract-locale-date';
import { Preco } from 'src/app/shared/models/preco.model';
import { PrecoService } from 'src/app/shared/services/preco.service';

@Component({
  selector: 'app-preco-delete',
  templateUrl: './preco-delete.component.html',
  styleUrls: ['./preco-delete.component.scss'],
})
export class PrecoDeleteComponent implements OnInit {
  preco_id: number;

  precoForm: UntypedFormGroup;

  get precoFormControl() {
    return this.precoForm.controls;
  }

  constructor(
    private precoService: PrecoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.precoForm = fb.group({
      preco_id: ['', Validators.required],
      preco_compra: ['', Validators.required],
      preco_venda: ['', Validators.required],
      preco_data_inicial: ['', Validators.required],
      preco_data_final: ['', Validators.nullValidator],
    });
  }

  ngOnInit(): void {
    this.preco_id = +this.route.snapshot.paramMap.get('preco_id');
    this.precoForm.controls['preco_id'].setValue(this.preco_id);
    this.precoService.getPreco(this.preco_id).subscribe((preco: Preco) => {
      this.precoForm.controls['preco_compra'].setValue(preco.preco_compra);
      this.precoForm.controls['preco_venda'].setValue(preco.preco_venda);
      this.precoForm.controls['preco_data_inicial'].setValue(
        extractLocaleDate(preco.preco_data_inicial)
      );
      this.precoForm.controls['preco_data_final'].setValue(
        extractLocaleDate(preco.preco_data_final)
      );
    });
  }

  deletePreco(): void {
    this.precoService.deleteExistingPreco(this.preco_id).subscribe((preco) => {
      this.precoService.showMessage('Preço excluído com sucesso!', 'backsnack');
      this.router.navigate(['admin', 'preco']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'preco']);
  }
}
