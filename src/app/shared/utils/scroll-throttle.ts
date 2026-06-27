export class ScrollThrottle {
  private timeoutId: any = null;

  constructor(private readonly callback: () => void, private readonly delayMs: number = 150) {}

  trigger(): void {
    if (this.timeoutId) return;
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.callback();
    }, this.delayMs);
  }

  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}