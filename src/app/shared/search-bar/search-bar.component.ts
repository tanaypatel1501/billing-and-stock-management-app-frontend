import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule,FontAwesomeModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent {
  isExpanded = false;
  faSearch = faSearch;

  constructor(private elementRef: ElementRef) {}

  toggleSearch(): void {
    this.isExpanded = !this.isExpanded;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isExpanded = false;
    }
  }
}
