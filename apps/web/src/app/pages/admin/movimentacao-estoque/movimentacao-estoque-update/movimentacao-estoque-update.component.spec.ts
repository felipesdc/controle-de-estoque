import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovimentacaoEstoqueUpdateComponent } from './movimentacao-estoque-update.component';

describe('MovimentacaoEstoqueUpdateComponent', () => {
  let component: MovimentacaoEstoqueUpdateComponent;
  let fixture: ComponentFixture<MovimentacaoEstoqueUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MovimentacaoEstoqueUpdateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MovimentacaoEstoqueUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
