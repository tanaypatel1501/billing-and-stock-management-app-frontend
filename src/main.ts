/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Load config.json BEFORE Angular starts
fetch('assets/config.json')
  .then(response => response.json())
  .then(config => {
    // attach config globally
    (window as any).runtimeConfig = config;

    // now bootstrap Angular
    return platformBrowserDynamic().bootstrapModule(AppModule);
  })
  .catch(err => {
    console.error('Error loading config:', err);
    // fallback bootstrap if config fails
    return platformBrowserDynamic().bootstrapModule(AppModule);
  });
