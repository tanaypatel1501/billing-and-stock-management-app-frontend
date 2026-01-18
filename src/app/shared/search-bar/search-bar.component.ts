import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faTimes, faBox, faSearchMinus, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  @Input() suggestions: any[] = [];
  @Input() labelKey: string = '';
  @Input() subLabelKey: string = '';
  @Input() notFoundText: string = 'results';
  @Input() isLoading: boolean = false;
  
  @Output() onType = new EventEmitter<string>();
  @Output() onSelect = new EventEmitter<any>();
  @Output() onSearch = new EventEmitter<string>();

  isExpanded = false;
  searchText = '';
  highlightedIndex = -1;

  // FontAwesome Icons
  faSearch = faSearch;
  faTimes = faTimes;
  faBox = faBox;
  faSearchMinus = faSearchMinus;
  faLightbulb = faLightbulb;

  constructor(private elementRef: ElementRef) {}

  onFormSubmit(event: Event): void {
    event.preventDefault(); 
    this.onEnter();

    const input = this.elementRef.nativeElement.querySelector('.search-input');
    if (input) input.blur();
  }

  toggleSearch(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      // Focus input after expansion
      setTimeout(() => {
        const input = this.elementRef.nativeElement.querySelector('.search-input');
        if (input) input.focus();
      }, 100);
    }
    if (this.searchText.length > 0) {
      this.onType.emit(this.searchText);
    }else {
      this.clearSearch();
    }
  }

  onFocus(): void {
    this.isExpanded = true;
  }

  onInput(): void {
    this.highlightedIndex = -1;
    this.onType.emit(this.searchText);
  }

  selectItem(item: any): void {
    this.searchText = this.resolveField(item, this.labelKey);
    this.onSelect.emit(item);
    this.onSearch.emit(this.searchText);
    this.isExpanded = false;
    this.highlightedIndex = -1;
  }

  onEnter(): void {
    if (this.highlightedIndex >= 0 && this.suggestions[this.highlightedIndex]) {
      this.selectItem(this.suggestions[this.highlightedIndex]);
    } else {
      this.onSearch.emit(this.searchText);
      this.isExpanded = false;
      this.highlightedIndex = -1;
    }
  }

  clearSearch(): void {
    this.searchText = '';
    this.highlightedIndex = -1;
    this.onType.emit('');
  }

  resolveField(obj: any, path: string): string {
    return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isExpanded = false;
      this.highlightedIndex = -1;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isExpanded || this.suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(
          this.highlightedIndex + 1,
          this.suggestions.length - 1
        );
        this.scrollToHighlighted();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.scrollToHighlighted();
        break;

      case 'Escape':
        event.preventDefault();
        this.isExpanded = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  private scrollToHighlighted(): void {
    setTimeout(() => {
      const dropdown = this.elementRef.nativeElement.querySelector('.suggestion-dropdown');
      const highlighted = this.elementRef.nativeElement.querySelector('.suggestion-item.highlighted');
      
      if (dropdown && highlighted) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const highlightedRect = highlighted.getBoundingClientRect();
        
        if (highlightedRect.bottom > dropdownRect.bottom) {
          highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (highlightedRect.top < dropdownRect.top) {
          highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, 0);
  }
}