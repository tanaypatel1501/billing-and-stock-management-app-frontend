import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOCUMENTATION_NAV, DocNavSection } from '../documentation-nav';
import { DOCUMENTATION_SEARCH_INDEX } from '../documentation-search-index';
import { DebouncedSearch } from '../../shared/utils/debounced-search';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-documentation-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './documentation-shell.component.html',
  styleUrls: ['./documentation-shell.component.scss']
})
export class DocumentationShellComponent implements OnDestroy {
  nav = DOCUMENTATION_NAV;
  filteredNav: DocNavSection[] = DOCUMENTATION_NAV;
  searchText = '';
  isSearching = false;
  isSidebarOpen = false;

  private debouncedSearch = new DebouncedSearch(text => this.performSearch(text), 250);

  ngOnDestroy(): void {
    this.debouncedSearch.destroy();
  }

  onSearchInput(text: string): void {
    this.searchText = text;

    if (window.innerWidth <= 992 && text.trim()) {
      this.isSidebarOpen = true;
    }
    
    if (!text.trim()) {
      this.filteredNav = this.nav;
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.debouncedSearch.next(text);
  }

  private performSearch(text: string): void {
    const q = text.toLowerCase().trim();
    const matchingSlugs = new Set(
      DOCUMENTATION_SEARCH_INDEX
        .filter(entry => entry.title.toLowerCase().includes(q) || entry.keywords.toLowerCase().includes(q))
        .map(entry => entry.slug)
    );

    this.filteredNav = this.nav
      .map(section => ({
        section: section.section,
        items: section.items.filter(item => matchingSlugs.has(item.slug))
      }))
      .filter(section => section.items.length > 0);

    this.isSearching = false;
  }

  get hasResults(): boolean {
    return this.filteredNav.length > 0;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (window.innerWidth <= 992 && this.isSidebarOpen) {
      this.closeSidebar();
    }
  }
}