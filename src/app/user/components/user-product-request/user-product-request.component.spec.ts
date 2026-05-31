import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserProductRequestComponent } from './user-product-request.component';

describe('UserProductRequestComponent', () => {
  let component: UserProductRequestComponent;
  let fixture: ComponentFixture<UserProductRequestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserProductRequestComponent]
    });
    fixture = TestBed.createComponent(UserProductRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
