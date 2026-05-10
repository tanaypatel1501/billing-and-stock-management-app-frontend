import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceTemplateTwoComponent } from './invoice-template-two.component';

describe('InvoiceTemplateTwoComponent', () => {
  let component: InvoiceTemplateTwoComponent;
  let fixture: ComponentFixture<InvoiceTemplateTwoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceTemplateTwoComponent]
    });
    fixture = TestBed.createComponent(InvoiceTemplateTwoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
