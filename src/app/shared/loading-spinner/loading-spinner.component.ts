import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent, SkeletonType } from 'src/app/shared/skeleton/skeleton.component';
import { USE_SKELETONS } from 'src/app/utils/platform';

export type LoadingSpinnerMode = 'full' | 'inline';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  @Input() mode: LoadingSpinnerMode = 'full';
  @Input() text: string = 'Loading';
  @Input() skeleton: SkeletonType | null = null;
  @Input() skeletonPadded = false;
  readonly useSkeleton = USE_SKELETONS;
}