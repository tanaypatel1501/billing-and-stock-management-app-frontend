import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

interface PdfPrintPlugin {
  print(options: { base64: string; jobName: string }): Promise<void>;
}

const PdfPrint = registerPlugin<PdfPrintPlugin>('PdfPrint');

@Injectable({ providedIn: 'root' })
export class NativePrintService {
  async printPdf(blob: Blob, jobName: string): Promise<void> {
    const base64 = await this.blobToBase64(blob);
    await PdfPrint.print({ base64, jobName });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}