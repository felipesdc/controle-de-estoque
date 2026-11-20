import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,
  selector: 'app-fornecedores',
  templateUrl: './fornecedores.component.html',
  styleUrl: './fornecedores.component.scss',
})
export class FornecedoresComponent {}
