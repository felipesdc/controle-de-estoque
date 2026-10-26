import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import extractDate from 'src/app/shared/helpers/extract-date';
import { Preco } from 'src/app/shared/models/preco.model';
import { PrecoService } from 'src/app/shared/services/preco.service';

@Component({
  selector: 'app-preco-update',
  templateUrl: './preco-update.component.html',
  styleUrls: ['./preco-update.component.scss'],
})
export class PrecoUpdateComponent implements OnInit {
  preco_id: number;

  precoForm: UntypedFormGroup;

  get precoFormControl() {
    return this.precoForm.controls;
  }

  constructor(
    private precoService: PrecoService,
    private fb: UntypedFormBuilder,
    private router: Router,
    private route: ActivatedRoute
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
    this.precoService.getPreco(this.preco_id).subscribe((preco) => {
      this.precoForm.controls['preco_compra'].setValue(preco.preco_compra);
      this.precoForm.controls['preco_venda'].setValue(preco.preco_venda);
      this.precoForm.controls['preco_data_inicial'].setValue(
        preco.preco_data_inicial
      );
      this.precoForm.controls['preco_data_final'].setValue(
        preco.preco_data_final
      );
    });
  }

  updatePreco(): void {
    let precoSemTratamento = this.precoForm.value as Preco;
    let preco_data_inicial = extractDate(
      precoSemTratamento.preco_data_inicial.toString()
    );
    let preco_data_final: string;
    if (
      precoSemTratamento.preco_data_final === '' ||
      precoSemTratamento.preco_data_final === null
    ) {
      preco_data_final = null;
    } else {
      preco_data_final = extractDate(
        precoSemTratamento.preco_data_final.toString()
      );
    }
    const preco = {
      ...precoSemTratamento,
      preco_data_inicial,
      preco_data_final,
    };
    this.precoService
      .updateExistingPreco(preco, this.preco_id)
      .subscribe((preco) => {
        this.precoService.showMessage(
          'Preço atualizado com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'preco']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'preco']);
  }
}
