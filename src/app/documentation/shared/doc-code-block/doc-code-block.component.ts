import { Component, Input, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';

@Component({
  selector: 'doc-code-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="doc-code">
      <div class="doc-code__header">
        <span class="doc-code__lang">{{ language }}</span>
        <button class="doc-code__copy" (click)="copy()">
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <pre><code #codeEl class="language-{{ language }}">{{ code }}</code></pre>
    </div>
  `,
  styleUrls: ['./doc-code-block.component.scss']
})
export class DocCodeBlockComponent implements AfterViewInit {
  @Input() code = '';
  @Input() language: 'typescript' | 'java' | 'bash' | 'sql' | 'yaml' | 'json' = 'typescript';
  @ViewChild('codeEl') codeEl!: ElementRef<HTMLElement>;

  copied = false;

  ngAfterViewInit(): void {
    Prism.highlightElement(this.codeEl.nativeElement);
  }

  copy(): void {
    navigator.clipboard.writeText(this.code).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    });
  }
}