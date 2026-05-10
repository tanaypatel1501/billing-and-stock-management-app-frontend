import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceTemplateOneComponent } from './invoice-template-one.component';

describe('InvoiceTemplateOneComponent', () => {
  let component: InvoiceTemplateOneComponent;
  let fixture: ComponentFixture<InvoiceTemplateOneComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceTemplateOneComponent]
    });
    fixture = TestBed.createComponent(InvoiceTemplateOneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
