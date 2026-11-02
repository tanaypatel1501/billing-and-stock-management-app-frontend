import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'stock' | 'logs' | 'bills' | 'purchasers' | 'products' | 'sales' | 'profile';
export type SkeletonMode = 'full' | 'inline';

const FULL_ROWS: Record<SkeletonType, number> = {
  stock: 4,
  logs: 5,
  bills: 5,
  purchasers: 6,
  products: 5,
  sales: 1, 
  profile: 1           
};

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss']
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'stock';
  @Input() mode: SkeletonMode = 'full';
  @Input() padded = false;

  readonly inlineRows = [0, 1];

  private cache: { type?: SkeletonType; rows: number[] } = { rows: [] };

  get fullRows(): number[] {
    if (this.cache.type !== this.type) {
      this.cache = {
        type: this.type,
        rows: Array.from({ length: FULL_ROWS[this.type] ?? 5 }, (_, i) => i)
      };
    }
    return this.cache.rows;
  }
}