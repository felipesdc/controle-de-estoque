import { Component } from '@angular/core';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  usuario_login: string = '';
  usuario_password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private authService: AuthService) {}

  login(): void {
    this.isLoading = true;
    this.authService
      .login(this.usuario_login, this.usuario_password)
      .subscribe((success) => {
        this.isLoading = false;
        if (!success) {
          this.errorMessage = 'Usuário ou senha inválidos!';
          this.authService.showMessage(this.errorMessage, 'backsnack');
        }
      });
  }
}
