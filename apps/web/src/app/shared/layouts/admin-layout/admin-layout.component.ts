import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { SidenavService } from '../../services/sidenav.service';
@Component({ selector: 'app-admin-layout', templateUrl: './admin-layout.component.html', styleUrls: ['./admin-layout.component.scss'] })
export class AdminLayoutComponent implements AfterViewInit {
  @ViewChild(MatSidenav) sidenav!: MatSidenav;
  constructor(public nav: SidenavService) {}
  ngAfterViewInit(): void { this.nav.setSidenav(this.sidenav); }
}
