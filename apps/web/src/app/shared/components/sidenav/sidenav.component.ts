import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SidenavService } from '../../services/sidenav.service';
@Component({ selector: 'app-sidenav', templateUrl: './sidenav.component.html', styleUrls: ['./sidenav.component.scss'] })
export class SidenavComponent {
  constructor(public auth: AuthService, public nav: SidenavService) {}
}
