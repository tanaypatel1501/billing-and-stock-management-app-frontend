import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export class DebouncedSearch {
  private readonly subject = new Subject<string>();
  private readonly subscription: Subscription;

  constructor(callback: (text: string) => void, debounceMs: number = 250) {
    this.subscription = this.subject.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged()
    ).subscribe(callback);
  }

  next(text: string): void {
    this.subject.next(text);
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}