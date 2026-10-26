import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { Router } from '@angular/router';
import { Perfil } from 'src/app/shared/models/perfil.model';
import { Usuario } from 'src/app/shared/models/usuario.model';
import { PerfilService } from 'src/app/shared/services/perfil.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-usuario-create',
  templateUrl: './usuario-create.component.html',
  styleUrls: ['./usuario-create.component.scss'],
})
export class UsuarioCreateComponent implements OnInit {
  usuarioForm: UntypedFormGroup;

  perfis!: Perfil[];

  constructor(
    private usuarioService: UsuarioService,
    private perfilService: PerfilService,
    private router: Router,
    private fb: UntypedFormBuilder
  ) {
    this.usuarioForm = fb.group({
      usuario_nome: ['', Validators.required],
      usuario_email: ['', Validators.required],
      usuario_password: ['', Validators.required],
      usuario_nome_completo: ['', Validators.required],
      usuario_inscricao: [
        new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        Validators.required,
      ],
      usuario_perfil_id: ['', Validators.required],
      usuario_perfil: ['', Validators.required],
      usuario_status: ['', Validators.required],
    });
  }

  get usuario(): Usuario {
    let usuarioSemTratamento = this.usuarioForm.value as Usuario;
    let usuario_inscricao = new Date();
    return { ...usuarioSemTratamento, usuario_inscricao };
  }

  get usuarioFormControl() {
    return this.usuarioForm.controls;
  }

  ngOnInit(): void {
    this.perfilService.getPerfis().subscribe((perfis) => {
      this.perfis = perfis;
    });
  }

  createUsuario(): void {
    this.usuarioService.createNewUsuario(this.usuario).subscribe(() => {
      this.usuarioService.showMessage(
        'Usuário criado com sucesso!',
        'backsnack'
      );
      this.router.navigate(['admin', 'usuario']);
    });
  }

  cancel(): void {
    this.router.navigate(['admin', 'usuario']);
  }

  alteraNomeDoPerfil(perfil_id: number) {
    this.usuarioForm.controls['usuario_perfil'].setValue(
      this.perfis.find((perfil) => perfil.perfil_id === perfil_id).perfil_nome
    );
  }
}
