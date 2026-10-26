import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Perfil } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/perfil.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-usuario-update',
  templateUrl: './usuario-update.component.html',
  styleUrls: ['./usuario-update.component.scss'],
})
export class UsuarioUpdateComponent implements OnInit {
  usuario_id: number;

  usuarioForm: UntypedFormGroup;

  perfis!: Perfil[];

  get usuarioFormControl() {
    return this.usuarioForm.controls;
  }

  constructor(
    private usuarioService: UsuarioService,
    private perfilService: PerfilService,
    private fb: UntypedFormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.usuarioForm = fb.group({
      usuario_id: ['', Validators.required],
      usuario_nome: ['', Validators.required],
      usuario_email: ['', Validators.required],
      usuario_password: [''],
      usuario_nome_completo: ['', Validators.required],
      usuario_inscricao: ['', Validators.required],
      usuario_perfil_id: ['', Validators.required],
      usuario_perfil: ['', Validators.required],
      usuario_status: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.perfilService
      .getPerfis()
      .subscribe((perfis) => (this.perfis = perfis));
    this.usuario_id = +this.route.snapshot.paramMap.get('usuario_id');
    this.usuarioForm.controls['usuario_id'].setValue(this.usuario_id);
    this.usuarioService.getUsuario(this.usuario_id).subscribe((usuario) => {
      let usuario_perfil = this.perfis.find(
        (perfil) => perfil.perfil_id === usuario.usuario_perfil_id
      ).perfil_nome;
      this.usuarioForm.controls['usuario_nome'].setValue(usuario.usuario_nome);
      this.usuarioForm.controls['usuario_email'].setValue(
        usuario.usuario_email
      );
      this.usuarioForm.controls['usuario_password'].setValue(
        ''
      );
      this.usuarioForm.controls['usuario_nome_completo'].setValue(
        usuario.usuario_nome_completo
      );
      this.usuarioForm.controls['usuario_inscricao'].setValue(
        usuario.usuario_inscricao
      );
      this.usuarioForm.controls['usuario_perfil_id'].setValue(
        usuario.usuario_perfil_id
      );
      this.usuarioForm.controls['usuario_perfil'].setValue(usuario_perfil);
      this.usuarioForm.controls['usuario_status'].setValue(
        usuario.usuario_status
      );
    });
  }

  updateUsuario(): void {
    this.usuarioService
      .updateExistingUsuario(this.usuarioForm.value, this.usuario_id)
      .subscribe((usuario) => {
        this.usuarioService.showMessage(
          'Usuário atualizado com sucesso!',
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
