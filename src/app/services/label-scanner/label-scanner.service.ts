import { Injectable } from '@angular/core';
import { createWorker } from 'tesseract.js';

export interface ScannedLabelData {
  batchNo:    string | null;
  expiryDate: string | null; // YYYY-MM-DD (last day of month)
  mrp:        number | null;
}

@Injectable({ providedIn: 'root' })
export class LabelScannerService {

  // ─── PUBLIC ENTRY POINT ──────────────────────────────────────────────────
  async scanLabel(imageData: string): Promise<ScannedLabelData> {
    const worker = await createWorker('eng', 1, {
      logger: () => {} // silence progress logs
    });

    try {
      const { data: { text } } = await worker.recognize(imageData);
      return this.parseLabel(text);
    } finally {
      await worker.terminate();
    }
  }

  // ─── MASTER PARSER ───────────────────────────────────────────────────────
  private parseLabel(raw: string): ScannedLabelData {
    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    return {
      batchNo:    this.extractBatchNo(lines),
      expiryDate: this.extractExpiryDate(lines),
      mrp:        this.extractMrp(lines),
    };
  }

  // ─── BATCH NUMBER ────────────────────────────────────────────────────────
  private extractBatchNo(lines: string[]): string | null {
    const batchKeywords = /batch\s*no|batch\s*number|b\.no|lot\s*no|घान\s*संख्या/i;

    for (let i = 0; i < lines.length; i++) {
      if (batchKeywords.test(lines[i])) {
        // Try same line first: "Batch No: ABC-123"
        const sameLine = lines[i].replace(batchKeywords, '').replace(/[:\-\s]+/, '').trim();
        const batchPattern = /[A-Z]{1,4}[-\/]?[A-Z0-9]{3,10}/i;

        if (batchPattern.test(sameLine)) {
          return sameLine.match(batchPattern)![0].toUpperCase();
        }

        // Try next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (batchPattern.test(nextLine)) {
            return nextLine.match(batchPattern)![0].toUpperCase();
          }
        }
      }
    }

    // Fallback: find a standalone batch-like token (e.g. US-25349G, NHT-5K011)
    // Must have letters + hyphen + alphanumeric, NOT a date pattern
    const batchStandalone = /\b([A-Z]{2,4}-[A-Z0-9]{3,10})\b/g;
    const fullText = lines.join(' ');
    const matches = [...fullText.matchAll(batchStandalone)].map(m => m[1]);

    // Filter out anything that looks like a date (e.g. FEB-2027)
    const monthNames = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4}$/i;
    const filtered = matches.filter(m => !monthNames.test(m));

    return filtered[0] ?? null;
  }

  // ─── EXPIRY DATE ─────────────────────────────────────────────────────────
  private extractExpiryDate(lines: string[]): string | null {
    const expiryKeywords = /exp(iry|\.?\s*date)?|अवसान|समाप्ति/i;

    // Strategy 1: find the line with expiry keyword, grab date from same or next line
    for (let i = 0; i < lines.length; i++) {
      if (expiryKeywords.test(lines[i])) {
        const date = this.findDateInText(lines[i])
                  ?? (i + 1 < lines.length ? this.findDateInText(lines[i + 1]) : null);
        if (date) return this.toLastDayOfMonth(date);
      }
    }

    // Strategy 2: collect ALL dates in the document, pick the LATEST one
    // (expiry is always later than mfg date)
    const allDates = this.collectAllDates(lines);
    if (allDates.length === 0) return null;

    // Sort ascending → last entry is expiry
    allDates.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    const expiry = allDates[allDates.length - 1];
    return this.toLastDayOfMonth({ year: expiry.year, month: expiry.month });
  }

  // ─── MRP ─────────────────────────────────────────────────────────────────
  private extractMrp(lines: string[]): number | null {
    const mrpKeywords = /m\.?r\.?p|max\.?\s*retail|अधिकतम\s*खुदरा/i;

    for (let i = 0; i < lines.length; i++) {
      if (mrpKeywords.test(lines[i])) {
        // Try same line: "MRP: 131.00" or "MRP Rs. 37.95"
        const sameLine = lines[i].replace(mrpKeywords, '').replace(/[₹Rs\.\s:]+/gi, ' ').trim();
        const numMatch = sameLine.match(/\d{1,5}(\.\d{1,2})?/);
        if (numMatch) return parseFloat(numMatch[0]);

        // Try next 1–2 lines
        for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
          const cleaned = lines[j].replace(/[₹Rs\.\s:]+/gi, ' ').trim();
          const n = cleaned.match(/^\s*(\d{1,5}(\.\d{1,2})?)/);
          if (n) return parseFloat(n[1]);
        }
      }
    }

    // Fallback: look for a sticker-block number that looks like a price
    // (2–5 digits with optional .xx, NOT a year like 2025/2027)
    const fullText = lines.join('\n');
    const pricePattern = /\b(\d{2,4}\.\d{2})\b/g;
    const prices = [...fullText.matchAll(pricePattern)]
      .map(m => parseFloat(m[1]))
      .filter(p => p < 10000); // sanity filter

    return prices.length > 0 ? prices[0] : null;
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  /** Extract first date from a string, returns {year, month} or null */
  private findDateInText(text: string): { year: number; month: number } | null {
    // Pattern: MM/YYYY  or  M/YYYY
    const slashDate = text.match(/\b(\d{1,2})\/(\d{4})\b/);
    if (slashDate) {
      const month = parseInt(slashDate[1], 10);
      const year  = parseInt(slashDate[2], 10);
      if (month >= 1 && month <= 12 && year >= 2020) return { year, month };
    }

    // Pattern: MMM-YYYY  or  MMM/YYYY  (e.g. FEB-2027, OCT-2027, SEP-2025)
    const monthNames: Record<string, number> = {
      JAN: 1, FEB: 2, MAR: 3, APR: 4,  MAY: 5,  JUN: 6,
      JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
    };
    const namedDate = text.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\/](\d{4})\b/i);
    if (namedDate) {
      const month = monthNames[namedDate[1].toUpperCase()];
      const year  = parseInt(namedDate[2], 10);
      if (year >= 2020) return { year, month };
    }

    return null;
  }

  /** Scan all lines for dates and return them all */
  private collectAllDates(lines: string[]): { year: number; month: number }[] {
    const results: { year: number; month: number }[] = [];
    for (const line of lines) {
      const d = this.findDateInText(line);
      if (d) results.push(d);
    }
    return results;
  }

  /** Convert {year, month} to YYYY-MM-DD last day */
  private toLastDayOfMonth(d: { year: number; month: number }): string {
    const lastDay = new Date(d.year, d.month, 0).getDate();
    return `${d.year}-${String(d.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
}