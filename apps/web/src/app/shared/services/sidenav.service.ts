import { Injectable, OnDestroy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class SidenavService implements OnDestroy {
  private sidenav?: MatSidenav;
  private subscriptions = new Subscription();
  isMobile = false;
  constructor(breakpoints: BreakpointObserver, router: Router) {
    this.subscriptions.add(breakpoints.observe('(max-width: 900px)').subscribe(state => this.isMobile = state.matches));
    this.subscriptions.add(router.events.subscribe(event => { if (event instanceof NavigationEnd) this.closeMobile(); }));
  }
  setSidenav(sidenav: MatSidenav): void { this.sidenav = sidenav; }
  toggle(): void { this.sidenav?.toggle(); }
  open(): void { this.sidenav?.open(); }
  close(): void { this.sidenav?.close(); }
  closeMobile(): void { if (this.isMobile) this.close(); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
}
