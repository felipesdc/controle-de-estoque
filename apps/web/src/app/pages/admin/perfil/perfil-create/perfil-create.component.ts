import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Perfil } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/perfil.service';

@Component({
  selector: 'app-perfil-create',
  templateUrl: './perfil-create.component.html',
  styleUrls: ['./perfil-create.component.scss'],
})
export class PerfilCreateComponent implements OnInit {
  perfilForm: UntypedFormGroup;

  constructor(
    private perfilService: PerfilService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.perfilForm = fb.group({
      perfil_nome: ['', Validators.required],
    });
  }

  get perfil(): Perfil {
    const perfil = this.perfilForm.value;
    return perfil;
  }

  get perfilFormControl() {
    return this.perfilForm.controls;
  }

  ngOnInit(): void {}

  createPerfil(): void {
    this.perfilService.createNewPerfil(this.perfil).subscribe(() => {
      this.perfilService.showMessage('Perfil criado com sucesso!', 'backsnack');
      this.router.navigate(['admin', 'perfil']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'perfil']);
  }
}
