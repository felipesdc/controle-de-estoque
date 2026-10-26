import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FornecedorUpdateComponent } from './fornecedor-update.component';

describe('FornecedorUpdateComponent', () => {
  let component: FornecedorUpdateComponent;
  let fixture: ComponentFixture<FornecedorUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FornecedorUpdateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FornecedorUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
