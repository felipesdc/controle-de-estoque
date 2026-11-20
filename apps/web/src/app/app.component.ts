import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
}
