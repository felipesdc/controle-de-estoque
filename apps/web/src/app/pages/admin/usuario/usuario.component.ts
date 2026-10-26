import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Perfil } from 'src/app/shared/models/perfil.model';
import { Usuario } from 'src/app/shared/models/usuario.model';
import { PerfilService } from 'src/app/shared/services/perfil.service';
import { UsuarioService } from 'src/app/shared/services/usuario.service';

@Component({
  selector: 'app-crud-usuario',
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.scss'],
})
export class UsuarioComponent implements OnInit {
  usuarios!: Usuario[];
  perfis!: Perfil[];

  displayedColumns = [
    'usuario_id',
    'usuario_nome',
    'usuario_email',
    'usuario_nome_completo',
    'usuario_inscricao',
    'usuario_perfil',
    'usuario_status',
    'usuario_action',
  ];

  constructor(
    private usuarioService: UsuarioService,
    private perfilService: PerfilService
  ) {}

  ngOnInit(): void {
    forkJoin({
      perfis: this.perfilService.getPerfis(),
      usuarios: this.usuarioService.getUsuarios(),
    }).subscribe(({ perfis, usuarios }) => {
      this.perfis = perfis;

      this.usuarios = usuarios.map((usuario) => {
        const perfilEncontrado = perfis.find(
          (perfil) => perfil.perfil_id === usuario.usuario_perfil_id
        );
        return {
          ...usuario,
          usuario_perfil: perfilEncontrado?.perfil_nome || 'Desconhecido',
        };
      });
    });
  }
}
