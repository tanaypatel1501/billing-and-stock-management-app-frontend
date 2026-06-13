import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchasersComponent } from './purchasers.component';

describe('PurchasersComponent', () => {
  let component: PurchasersComponent;
  let fixture: ComponentFixture<PurchasersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PurchasersComponent]
    });
    fixture = TestBed.createComponent(PurchasersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
