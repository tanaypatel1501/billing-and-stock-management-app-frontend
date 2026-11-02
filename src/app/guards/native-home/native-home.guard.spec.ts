import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { nativeHomeGuard } from './native-home.guard';

describe('nativeHomeGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => nativeHomeGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
