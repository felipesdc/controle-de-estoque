import { Component, OnInit } from '@angular/core';
import { Perfil } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/perfil.service';

@Component({
  selector: 'app-crud-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit {
  perfis!: Perfil[];

  displayedColumns = ['perfil_id', 'perfil_nome', 'perfil_action'];

  constructor(private perfilService: PerfilService) {}

  ngOnInit(): void {
    this.perfilService.getPerfis().subscribe((perfis) => {
      this.perfis = perfis;
    });
  }
}
