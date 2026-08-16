import { Component, Input, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import mermaid from 'mermaid';

@Component({
  selector: 'doc-diagram',
  standalone: true,
  template: `<div #container class="doc-diagram"></div>`,
  styleUrls: ['./doc-diagram.component.scss']
})
export class DocDiagramComponent implements AfterViewInit, OnDestroy {
  @Input() diagram = '';
  @ViewChild('container') container!: ElementRef<HTMLElement>;

  private static counter = 0;
  private observer?: MutationObserver;

  ngAfterViewInit(): void {
    this.render();
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private cssVar(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private async render(): Promise<void> {
    if (!this.container) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const textMain = this.cssVar('--gstm-text-main', isDark ? '#f5f5f5' : '#333333');
    const cardBg = this.cssVar('--gstm-card-bg', isDark ? '#000000' : '#ffffff');
    const inputBg = this.cssVar('--gstm-input-bg', isDark ? '#252525' : '#fcfcfc');
    const border = this.cssVar('--gstm-input-border', isDark ? '#333333' : '#eeeeee');
    const primary = this.cssVar('--gstm-primary-color', '#48e3cc');
    const primaryHover = this.cssVar('--gstm-primary-hover', '#36c5b0');

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        background: cardBg,
        primaryColor: inputBg,
        primaryTextColor: textMain,
        primaryBorderColor: primary,
        secondaryColor: inputBg,
        tertiaryColor: cardBg,
        lineColor: primaryHover,
        textColor: textMain,
        mainBkg: inputBg,
        nodeBorder: primary,
        clusterBkg: cardBg,
        clusterBorder: border,
        titleColor: textMain,
        edgeLabelBackground: cardBg,

        // Sequence diagrams
        actorBkg: inputBg,
        actorBorder: primary,
        actorTextColor: textMain,
        actorLineColor: border,
        signalColor: textMain,
        signalTextColor: textMain,
        labelBoxBkgColor: inputBg,
        labelBoxBorderColor: primary,
        labelTextColor: textMain,
        loopTextColor: textMain,
        noteBkgColor: inputBg,
        noteBorderColor: primary,
        noteTextColor: textMain,
        activationBorderColor: primary,
        activationBkgColor: inputBg,
        sequenceNumberColor: cardBg,

        // ER diagrams
        entityBkg: inputBg,
        attributeBackgroundColorOdd: cardBg,
        attributeBackgroundColorEven: inputBg,
      }
    });

    const id = `doc-mermaid-${DocDiagramComponent.counter++}`;
    const { svg } = await mermaid.render(id, this.diagram.trim());
    this.container.nativeElement.innerHTML = svg;
  }
}