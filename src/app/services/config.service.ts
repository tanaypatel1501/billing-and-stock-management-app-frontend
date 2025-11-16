import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any;

  loadConfig() {
    return fetch('/assets/config.json')
      .then(res => res.json())
      .then(json => {
        this.config = json;
      });
  }

  get apiBaseUrl() {
    return this.config?.BASIC_URL;
  }
}