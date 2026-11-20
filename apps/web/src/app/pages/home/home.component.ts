import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false, selector: 'app-home', templateUrl: './home.component.html', styleUrls: ['./home.component.scss'] })
export class HomeComponent {}
