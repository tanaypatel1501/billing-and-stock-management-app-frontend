/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Angular should bootstrap normally.
// runtime-config.js is loaded via <script> in index.html
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
