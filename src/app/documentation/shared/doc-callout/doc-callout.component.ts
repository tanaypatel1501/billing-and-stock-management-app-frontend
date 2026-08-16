import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'doc-callout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="doc-callout" [class]="'doc-callout--' + type">
      <span class="doc-callout__icon">{{ icon }}</span>
      <div class="doc-callout__body">
        <strong *ngIf="title" class="doc-callout__title">{{ title }}</strong>
        <div class="doc-callout__content"><ng-content></ng-content></div>
      </div>
    </div>
  `,
  styleUrls: ['./doc-callout.component.scss']
})
export class DocCalloutComponent {
  @Input() type: 'info' | 'warning' | 'success' | 'danger' = 'info';
  @Input() title?: string;

  get icon(): string {
    return { info: 'ℹ️', warning: '⚠️', success: '✅', danger: '⛔' }[this.type];
  }
}