import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Injected by build.mjs: pdf.js's own worker, so reading a bill needs no network.
declare const __PDF_WORKER__: string;

let configured = false;

/** Reads a PDF in the browser and returns its text as printed lines (items on the same row joined left to right). */
export async function extractPdfLines(data: ArrayBuffer): Promise<string[]> {
  if (!configured) {
    pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([__PDF_WORKER__], { type: "text/javascript" }));
    configured = true;
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true, verbosity: 0 }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((i): i is typeof i & { str: string } => "str" in i && i.str.trim() !== "")
      .map((i) => ({ s: i.str, x: (i as { transform: number[] }).transform[4], y: (i as { transform: number[] }).transform[5], w: (i as { width: number }).width }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: { y: number; items: typeof items }[] = [];
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r.y - it.y) <= 2.5);
      if (row) row.items.push(it);
      else rows.push({ y: it.y, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let line = "";
      let end: number | null = null;
      for (const it of r.items) {
        if (end !== null) {
          const gap = it.x - end;
          line += gap > 12 ? "   " : gap > 1 ? " " : "";
        }
        line += it.s;
        end = it.x + it.w;
      }
      lines.push(line);
    }
    lines.push("---- page break ----");
  }
  return lines;
}
