/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Load external config.json before bootstrapping Angular
fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    // Store config globally so you can access it anywhere
    (window as any).runtimeConfig  = config;

    return platformBrowserDynamic().bootstrapModule(AppModule);
  })
  .catch(err => console.error('Error loading config:', err));