import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faSortUp, faSortDown, faTrash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-filter-button',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './filter-button.component.html',
  styleUrls: ['./filter-button.component.scss']
})
export class FilterButtonComponent {
  @Input() columns: { label: string, value: string }[] = [];
  @Input() currentSortBy: string | null = null;
  @Input() currentDirection: 'asc' | 'desc' = 'asc';
  @Input() availableActions: string[] = [];
  @Input() currentAction: string = '';
  @Input() showSort: boolean = true;
  @Output() onApplySort = new EventEmitter<{ 
    sortBy: string | null; 
    direction: 'asc' | 'desc'; 
    action?: string; 
  }>();

  showModal = false;
  selectedColumn = '';
  selectedDirection: 'asc' | 'desc' = 'asc';
  selectedAction = ''; 

  faFilter = faFilter;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faTrash = faTrash;

  toggleModal() {
    this.showModal = !this.showModal;
    if (this.showModal) {
      this.selectedColumn = this.currentSortBy || '';
      this.selectedDirection = this.currentDirection;
      this.selectedAction = this.currentAction || ''; // Initialize action state
    }
  }

  clearFilters() {
    this.selectedColumn = '';
    this.selectedDirection = 'asc';
    this.selectedAction = '';
    this.onApplySort.emit({ sortBy: null, direction: 'asc', action: '' });
    this.showModal = false;
  }

  apply() {
    this.onApplySort.emit({
      sortBy: this.selectedColumn || null,
      direction: this.selectedDirection,
      action: this.selectedAction
    });
    this.showModal = false;
  }
}