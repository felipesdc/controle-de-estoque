import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PerfilService } from 'src/app/shared/services/perfil.service';

@Component({
  selector: 'app-perfil-delete',
  templateUrl: './perfil-delete.component.html',
  styleUrls: ['./perfil-delete.component.scss'],
})
export class PerfilDeleteComponent implements OnInit {
  perfil_id: number;

  perfilForm: UntypedFormGroup;

  get perfilFormControl() {
    return this.perfilForm.controls;
  }

  constructor(
    private perfilService: PerfilService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder
  ) {
    this.perfilForm = fb.group({
      perfil_id: ['', Validators.required],
      perfil_nome: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.perfil_id = +this.route.snapshot.paramMap.get('perfil_id');
    this.perfilForm.controls['perfil_id'].setValue(this.perfil_id);
    this.perfilService.getPerfil(this.perfil_id).subscribe((perfil) => {
      this.perfilForm.controls['perfil_nome'].setValue(perfil.perfil_nome);
    });
  }

  deletePerfil(): void {
    this.perfilService
      .deleteExistingPerfil(this.perfil_id)
      .subscribe((perfil) => {
        this.perfilService.showMessage(
          'Perfil excluído com sucesso!',
          'backsnack'
        );
        this.router.navigate(['admin', 'perfil']);
      });
  }

  cancel(): void {
    this.router.navigate(['admin', 'perfil']);
  }
}
