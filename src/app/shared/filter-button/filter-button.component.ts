import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
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
  @Input() showDateFilter: boolean = false; 
  @Input() currentFromDate: string = '';
  @Input() currentToDate: string = '';

  @Output() onApplySort = new EventEmitter<{
    sortBy: string | null;
    direction: 'asc' | 'desc';
    action?: string;
    fromDate?: string;   
    toDate?: string;
  }>();

  showModal = false;
  selectedColumn = '';
  selectedDirection: 'asc' | 'desc' = 'asc';
  selectedAction = '';
  fromDate: string = '';
  toDate: string = '';

  faFilter = faFilter;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faTrash = faTrash;

  toggleModal() {
    this.showModal = !this.showModal;
    if (this.showModal) {
      this.selectedColumn = this.currentSortBy || '';
      this.selectedDirection = this.currentDirection;
      this.selectedAction = this.currentAction || '';
      this.fromDate = this.currentFromDate;  
      this.toDate   = this.currentToDate; 
    }
  }

  clearFilters() {
    this.selectedColumn = '';
    this.selectedDirection = 'asc';
    this.selectedAction = '';
    this.fromDate = '';
    this.toDate = '';
    this.onApplySort.emit({ sortBy: null, direction: 'asc', action: '', fromDate: '', toDate: '' });
    this.showModal = false;
  }

  apply() {
    this.onApplySort.emit({
      sortBy: this.selectedColumn || null,
      direction: this.selectedDirection,
      action: this.selectedAction,
      fromDate: this.fromDate,
      toDate: this.toDate
    });
    this.showModal = false;
  }
}