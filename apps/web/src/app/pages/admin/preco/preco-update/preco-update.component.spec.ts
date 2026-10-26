import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrecoUpdateComponent } from './preco-update.component';

describe('PrecoUpdateComponent', () => {
  let component: PrecoUpdateComponent;
  let fixture: ComponentFixture<PrecoUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrecoUpdateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrecoUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
