import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule,ReactiveFormsModule} from '@angular/forms';
import {MaterialModule} from 'src/app/shared/material/material.module';
import {AdminRoutingModule} from './admin-routing.module';
import {AdminComponent} from './admin.component';
import {AcessosComponent} from './acessos/acessos.component';
import {AcessoDialogComponent} from './acessos/acesso-dialog.component';
@NgModule({imports:[CommonModule,FormsModule,ReactiveFormsModule,MaterialModule,AdminRoutingModule],declarations:[AdminComponent,AcessosComponent,AcessoDialogComponent]})
export class AdminModule {}
