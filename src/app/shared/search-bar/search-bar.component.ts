import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule,FontAwesomeModule,FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent {
  @Input() suggestions: any[] = [];
  @Input() labelKey: string = '';
  @Input() subLabelKey: string = '';
  
  @Output() onType = new EventEmitter<string>();
  @Output() onSelect = new EventEmitter<any>();
  @Output() onSearch = new EventEmitter<string>();

  isExpanded = false;
  faSearch = faSearch;
  searchText = '';

  constructor(private elementRef: ElementRef) {}

  toggleSearch(): void {
    this.isExpanded = !this.isExpanded;
  }
  onInput() {
    this.onType.emit(this.searchText);
  }

  selectItem(item: any) {
    this.searchText = this.resolveField(item, this.labelKey);
    this.onSelect.emit(item);
  }

  onEnter() {
    this.onSearch.emit(this.searchText);
  }

  resolveField(obj: any, path: string) {
    return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isExpanded = false;
    }
  }
}
