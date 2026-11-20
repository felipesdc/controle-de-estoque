import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
