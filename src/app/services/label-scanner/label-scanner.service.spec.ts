import { TestBed } from '@angular/core/testing';

import { LabelScannerService } from './label-scanner.service';

describe('LabelScannerService', () => {
  let service: LabelScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LabelScannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
