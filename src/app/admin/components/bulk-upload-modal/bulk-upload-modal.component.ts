import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { faUpload, faFile, faColumns, faEye, faExclamationTriangle, faExclamationCircle, faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-bulk-upload-modal',
  templateUrl: './bulk-upload-modal.component.html',
  styleUrls: ['./bulk-upload-modal.component.css']
})
export class BulkUploadModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() result = new EventEmitter<{ success: boolean; payload: any }>();

  selectedFile: File | null = null;
  firstRowIsHeader = true;
  parsedRawRows: any[][] | null = null;
  previewHeaders: string[] = [];
  previewRows: any[][] = [];
  fileError: string | null = null;
  submitting = false;

  faUpload = faUpload;
  faFile = faFile;
  faColumns = faColumns;
  faEye = faEye;
  faExclamationTriangle = faExclamationTriangle;
  faExclamationCircle = faExclamationCircle;
  faCloudUploadAlt = faCloudUploadAlt;

  // mapping from internal field key -> selected header
  mapping: { [field: string]: string | null } = {};
  // list of internal fields to map to
  internalFields = [
    { key: 'name', label: 'Product Name' },
    { key: 'hsn', label: 'HSN' },
    { key: 'mrp', label: 'MRP' },
    { key: 'cgst', label: 'CGST' },
    { key: 'sgst', label: 'SGST' },
    { key: 'packing', label: 'Packing' }
  ];

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.reset();
  }

  reset() {
    this.selectedFile = null;
    this.firstRowIsHeader = true;
    this.parsedRawRows = null;
    this.previewHeaders = [];
    this.previewRows = [];
    this.fileError = null;
    this.mapping = {};
    this.internalFields.forEach(f => this.mapping[f.key] = null);
    this.submitting = false;
    this.selectedHeaders = new Set();
    this.numericIssues = {};
    this.numericValidationPassed = true;
  }

  // runtime state for validation and unique selection
  selectedHeaders: Set<string> = new Set();
  numericIssues: { [field: string]: { invalidCount: number; samples: any[] } } = {};
  numericValidationPassed = true;

  onFileChange(evt: any) {
    this.fileError = null;
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files && target.files.length) {
      const file = target.files[0];
      this.selectedFile = file;
      this.parseFile(file);
    }
  }

  parseFile(file: File) {
    this.fileError = null;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = e.target.result;
      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        this.parsedRawRows = rows;
        this.computePreview(rows);
        // after parse, attempt to auto-map
        this.autoMapHeaders();
      } catch (err) {
        console.error(err);
        this.fileError = 'Failed to parse file. Ensure it is a valid XLSX/CSV file.';
      }
    };
    reader.onerror = (err) => { console.error(err); this.fileError = 'Failed to read file.'; };
    reader.readAsArrayBuffer(file);
  }

  computePreview(rows: any[][]) {
    if (!rows || !rows.length) { this.previewHeaders = []; this.previewRows = []; return; }
    const maxPreview = 10;
    if (this.firstRowIsHeader) {
      const headerRow = rows[0].map((h: any, idx: number) => h !== undefined && h !== null && String(h).trim() !== '' ? String(h) : `Column ${idx+1}`);
      this.previewHeaders = headerRow;
      const dataRows = rows.slice(1, 1 + maxPreview);
      this.previewRows = dataRows.map(r => {
        const arr: any[] = [];
        for (let i = 0; i < headerRow.length; i++) arr.push(r && r[i] != null ? r[i] : '');
        return arr;
      });
    } else {
      const previewSlice = rows.slice(0, maxPreview);
      let maxCols = 0; previewSlice.forEach(r => { if (r && r.length > maxCols) maxCols = r.length; }); if (maxCols === 0) maxCols = rows[0].length || 1;
      this.previewHeaders = Array.from({ length: maxCols }).map((_, i) => `Column ${i+1}`);
      this.previewRows = previewSlice.map(r => {
        const arr: any[] = [];
        for (let i = 0; i < maxCols; i++) arr.push(r && r[i] != null ? r[i] : '');
        return arr;
      });
    }

    // reset mapping choices to null so user maps fresh
    // if mapping already existed, keep it; otherwise set null
    this.internalFields.forEach(f => { if (!(f.key in this.mapping)) this.mapping[f.key] = null; });

    // update runtime validation state
    this.updateSelectedHeaders();
    this.checkNumericValidity();
  }

  toggleHeader() {
    if (this.parsedRawRows) {
      this.computePreview(this.parsedRawRows);
      // re-attempt auto-mapping when header toggle changes
      this.autoMapHeaders();
    }
  }

  /** Attempt to auto-map headers to internal fields using exact/case-insensitive matching and aliases. */
  autoMapHeaders() {
    if (!this.previewHeaders || !this.previewHeaders.length) return;
    // helper normalize
    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // synonyms for matching common header names to internal keys
    const synonyms: { [k: string]: string[] } = {
      name: ['name', 'productname', 'product', 'product_name', 'productname', 'sku', 'productsku'],
      hsn: ['hsn'],
      mrp: ['mrp', 'price', 'sellingprice', 'rate', 'amount'],
      cgst: ['cgst'],
      sgst: ['sgst'],
      packing: ['packing', 'pack']
    };

    const headerNorms = this.previewHeaders.map(h => ({ raw: h, n: norm(h) }));

    // try to assign each internal field if there's an exact header match
    this.internalFields.forEach(field => {
      if (this.mapping[field.key]) return; // already mapped
      const keyNorm = norm(field.key);
      const labelNorm = norm(field.label || '');

      // find header where normalized equals key or label
      let found = headerNorms.find(h => h.n === keyNorm || h.n === labelNorm);
      if (!found) {
        // try synonyms
        const syns = synonyms[field.key] || [];
        found = headerNorms.find(h => syns.includes(h.n));
      }

      if (found) {
        // ensure header isn't already taken
        const alreadyTaken = Object.keys(this.mapping).some(k => this.mapping[k] === found!.raw);
        if (!alreadyTaken) this.mapping[field.key] = found.raw;
      }
    });

    this.updateSelectedHeaders();
    this.checkNumericValidity();
  }

  updateSelectedHeaders() {
    this.selectedHeaders = new Set();
    Object.keys(this.mapping).forEach(k => {
      const v = this.mapping[k]; if (v) this.selectedHeaders.add(v);
    });
  }

  onMappingChange() {
    this.updateSelectedHeaders();
    this.checkNumericValidity();
  }

  isHeaderSelected(hdr: string) {
    return this.selectedHeaders.has(hdr);
  }

  checkNumericValidity() {
    this.numericIssues = {};
    this.numericValidationPassed = true;
    if (!this.previewRows || !this.previewRows.length) return;

    const numericFields = ['mrp', 'cgst', 'sgst'];
    numericFields.forEach(fieldKey => {
      const header = this.mapping[fieldKey];
      if (!header) return;
      const colIndex = this.previewHeaders.indexOf(header);
      if (colIndex === -1) return;
      let invalidCount = 0;
      const samples: any[] = [];
      for (const row of this.previewRows) {
        const cell = row[colIndex];
        // allow empty strings? treat empty as invalid for numeric fields
        if (cell === null || cell === undefined || String(cell).trim() === '') {
          invalidCount++;
          if (samples.length < 5) samples.push(cell);
          continue;
        }
        const n = Number(String(cell).toString().replace(/[,\s]/g, ''));
        if (!isFinite(n)) { invalidCount++; if (samples.length < 5) samples.push(cell); }
      }
      if (invalidCount > 0) {
        this.numericIssues[fieldKey] = { invalidCount, samples };
        this.numericValidationPassed = false;
      }
    });
  }

  // simple validation: require mapping for name and mrp
  isValidMapping(): boolean {
    return !!this.mapping['name'] && !!this.mapping['mrp'] && this.numericValidationPassed;
  }

  submit() {
    if (!this.selectedFile) { this.fileError = 'Please select a file.'; return; }
    if (!this.isValidMapping()) {
      if (!this.mapping['name'] || !this.mapping['mrp']) {
        this.fileError = 'Please map required fields: Product Name and MRP.'; return;
      }
      if (!this.numericValidationPassed) {
        this.fileError = 'Numeric validation failed for mapped numeric columns. Fix the source file or adjust mappings.'; return;
      }
    }
    this.submitting = true;
    const fd = new FormData();
    fd.append('file', this.selectedFile, this.selectedFile.name);
    // include mapping as JSON string in case backend can use it
    fd.append('mapping', JSON.stringify(this.mapping));

    this.authService.uploadBulkProductsForm(fd).subscribe(
      (res) => {
        this.submitting = false;
        this.result.emit({ success: true, payload: res });
        this.closed.emit();
        this.reset();
      },
      (err) => {
        console.error('Bulk upload error', err);
        this.submitting = false;
        this.result.emit({ success: false, payload: err });
      }
    );
  }

  cancel() {
    this.closed.emit();
  }

}
