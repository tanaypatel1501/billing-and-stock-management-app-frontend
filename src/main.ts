/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Load config.json BEFORE bootstrapping Angular
fetch('assets/config.json')   // IMPORTANT: no leading slash on Render
  .then(response => response.json())
  .then(config => {
    (window as any).runtimeConfig = config;

    return bootstrapApplication(AppComponent, appConfig);
  })
  .catch(err => {
    console.error('Error loading config.json:', err);
    return bootstrapApplication(AppComponent, appConfig);
  });