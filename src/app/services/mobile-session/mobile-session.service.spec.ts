import { TestBed } from '@angular/core/testing';

import { MobileSessionService } from './mobile-session.service';

describe('MobileSessionService', () => {
  let service: MobileSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MobileSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
