import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMarkdown(content: string, filename: string): void {
  downloadBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), `${filename}.md`);
}

export function exportJson(data: unknown, filename: string): void {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }),
    `${filename}.json`
  );
}

export function exportHtml(markdown: string, filename: string): void {
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${md.render(markdown)}</body></html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${filename}.html`);
}

export function exportPdf(content: string, filename: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content, pageWidth) as string[];
  let y = margin;
  for (const line of lines) {
    if (y > pageHeight) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 16;
  }
  doc.save(`${filename}.pdf`);
}

export async function exportDocx(content: string, filename: string): Promise<void> {
  const paragraphs = content.split("\n").map((line) => {
    if (line.startsWith("### ")) {
      return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    }
    if (line.startsWith("## ")) {
      return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    }
    if (line.startsWith("# ")) {
      return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    }
    return new Paragraph({ children: [new TextRun(line)] });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

export async function copyToClipboard(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}
