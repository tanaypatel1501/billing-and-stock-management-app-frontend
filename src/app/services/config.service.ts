import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  constructor() { }

  get apiBaseUrl(): string {
    // Read directly from the window object where main.ts saved it
    return (window as any).runtimeConfig?.BASIC_URL;
  }
}