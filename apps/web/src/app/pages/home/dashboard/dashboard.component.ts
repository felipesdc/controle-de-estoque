import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Dashboard, DashboardService } from 'src/app/shared/services/dashboard.service';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  loading = true;
  error = '';
  constructor(private service: DashboardService, public auth: AuthService) {}
  ngOnInit(): void { this.carregar(); }
  carregar(): void {
    this.loading = true; this.error = '';
    this.service.getDashboard().pipe(finalize(() => this.loading = false)).subscribe({
      next: data => this.data = data,
      error: () => this.error = 'Não foi possível atualizar o painel. Tente novamente.',
    });
  }
}
