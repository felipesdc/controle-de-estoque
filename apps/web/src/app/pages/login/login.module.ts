import {RouterModule} from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { MaterialShellModule } from 'src/app/shared/material/material-shell.module';

@NgModule({
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule, MaterialShellModule],
  declarations: [LoginComponent],
  exports: [LoginComponent],
})
export class LoginModule {}
