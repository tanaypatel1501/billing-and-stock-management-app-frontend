import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  // Use BehaviorSubject to hold the current loading state (true/false)
  private _loading = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this._loading.asObservable();

  constructor() {}

  // Methods to control the state
  show() {
    this._loading.next(true);
  }

  hide() {
    this._loading.next(false);
  }
}