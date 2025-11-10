import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillPreviewComponent } from './bill-preview.component';

describe('BillPreviewComponent', () => {
  let component: BillPreviewComponent;
  let fixture: ComponentFixture<BillPreviewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BillPreviewComponent]
    });
    fixture = TestBed.createComponent(BillPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
