import { Component,ViewEncapsulation } from '@angular/core';
import { ThemeService,ThemeOption } from 'src/app/services/theme/theme.service';
import { faSun, faMoon, faDesktop, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent {
  // Icons
  faSun = faSun;
  faMoon = faMoon;
  faDesktop = faDesktop;
  faTimes = faTimes;

  constructor(public themeService: ThemeService) {}

  selectTheme(theme: ThemeOption) {
    this.themeService.setTheme(theme);
  }

  close() {
    this.themeService.closeSettings();
  }
}