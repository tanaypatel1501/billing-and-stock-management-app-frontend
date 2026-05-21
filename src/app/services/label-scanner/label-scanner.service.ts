import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/services/auth-service/auth.service';

export interface ScannedLabelData {
  batchNo:    string | null;
  expiryDate: string | null; // YYYY-MM-DD last day of month
  mrp:        number | null;
}

@Injectable({ providedIn: 'root' })
export class LabelScannerService {

  // Inject AuthService instead of HttpClient
  constructor(private authService: AuthService) {}

  // ── ENTRY POINT ───────────────────────────────────────────────────────────
  // Accepts the base64 imageData string from the camera component.
  // Converts to a Blob, sends to Spring Boot /api/ocr/scan via AuthService,
  // returns the parsed { batchNo, expiryDate, mrp }.
  async scanLabel(imageData: string): Promise<ScannedLabelData> {
    const blob     = this.base64ToBlob(imageData);
    const formData = new FormData();
    formData.append('image', blob, 'label.jpg');

    // Route the API call through AuthService
    const result = await firstValueFrom(
      this.authService.scanOcrLabel(formData)
    );

    return {
      batchNo:    result.batchNo    || null,
      expiryDate: result.expiryDate || null,
      mrp:        result.mrp        || null,
    };
  }

  // Convert base64 data URL → Blob for FormData upload
  private base64ToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',');
    const mime           = header.match(/:(.*?);/)![1];
    const binary         = atob(data);
    const bytes          = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}