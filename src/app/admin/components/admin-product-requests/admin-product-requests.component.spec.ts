import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProductRequestsComponent } from './admin-product-requests.component';

describe('AdminProductRequestsComponent', () => {
  let component: AdminProductRequestsComponent;
  let fixture: ComponentFixture<AdminProductRequestsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminProductRequestsComponent]
    });
    fixture = TestBed.createComponent(AdminProductRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
