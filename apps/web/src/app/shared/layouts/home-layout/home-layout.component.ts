import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { SidenavService } from '../../services/sidenav.service';
@Component({ selector: 'app-home-layout', templateUrl: './home-layout.component.html', styleUrls: ['./home-layout.component.scss'] })
export class HomeLayoutComponent implements AfterViewInit {
  @ViewChild(MatSidenav) sidenav!: MatSidenav;
  constructor(public nav: SidenavService) {}
  ngAfterViewInit(): void { this.nav.setSidenav(this.sidenav); }
}
