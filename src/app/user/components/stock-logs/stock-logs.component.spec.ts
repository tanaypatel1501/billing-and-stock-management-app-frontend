import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockLogsComponent } from './stock-logs.component';

describe('StockLogsComponent', () => {
  let component: StockLogsComponent;
  let fixture: ComponentFixture<StockLogsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StockLogsComponent]
    });
    fixture = TestBed.createComponent(StockLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
