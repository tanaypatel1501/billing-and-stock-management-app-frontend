import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
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
    // Compress image to max 800px wide BEFORE sending
    // This is the single biggest speed improvement — reduces payload from ~3MB to ~150KB
    const compressed = await this.compressImage(imageData, 800);

    const blob     = this.base64ToBlob(compressed);
    const formData = new FormData();
    formData.append('image', blob, 'label.jpg');

    const result = await firstValueFrom(
      this.authService.scanOcrLabel(formData).pipe(
        timeout(45000) // 45s client timeout — longer than Cloudflare's 30s so CF error shows first
      )
    );

    return {
      batchNo:    result.batchNo    || null,
      expiryDate: result.expiryDate || null,
      mrp:        result.mrp        || null,
    };
  }

  // Resize image to maxWidth, keeping aspect ratio, output as JPEG quality 0.85
  private compressImage(dataUrl: string, maxWidth: number): Promise<string> {
    return new Promise(resolve => {
      const img    = new Image();
      img.onload   = () => {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  }

  private base64ToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',');
    const mime           = header.match(/:(.*?);/)![1];
    const binary         = atob(data);
    const bytes          = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}