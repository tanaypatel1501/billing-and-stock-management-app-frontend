import { Directive, OnDestroy, OnInit } from '@angular/core';
import { NativeDockService } from 'src/app/services/native-dock/native-dock.service';

@Directive({
  selector: '[appSuppressDock]',
  standalone: true
})
export class SuppressDockDirective implements OnInit, OnDestroy {
  private release: (() => void) | null = null;

  constructor(private nativeDock: NativeDockService) {}

  ngOnInit(): void {
    this.release = this.nativeDock.suppress();
  }

  ngOnDestroy(): void {
    this.release?.();
    this.release = null;
  }
}