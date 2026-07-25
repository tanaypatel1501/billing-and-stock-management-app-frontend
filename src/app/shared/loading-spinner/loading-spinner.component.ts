import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingSpinnerMode = 'full' | 'inline';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  @Input() mode: LoadingSpinnerMode = 'full';
  @Input() text: string = 'Loading';
}