// frontend/src/utils/printDocument.js
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Builds a standalone HTML document from the file content and opens it in a
 * new tab via a blob URL, then auto-triggers the browser print dialog.
 * Using a blob URL avoids popup-blocked issues and document.write() failures.
 */
export function printDocument(content, fileName) {
  if (content == null || !fileName) return;

  const isMarkdown = fileName.toLowerCase().endsWith(".md");
  const bodyHtml = isMarkdown
    ? marked.parse(content)
    : `<pre class="plain-text">${escapeHtml(content)}</pre>`;

  const html = `<!DOCTYPE html>
<html dir="auto" lang="he">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(fileName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 13pt; }
    body {
      font-family: "David", "Times New Roman", serif;
      line-height: 1.8;
      color: #000;
      background: #fff;
      direction: rtl;
      padding: 20mm 22mm;
    }
    .print-title {
      font-size: 0.8em;
      color: #555;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 20px;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.4em; font-weight: bold; line-height: 1.3; }
    h1 { font-size: 1.8em; }
    h2 { font-size: 1.45em; }
    h3 { font-size: 1.2em; }
    p  { margin: 0.6em 0; }
    ul, ol { padding-right: 1.6em; margin: 0.5em 0; }
    li { margin: 0.2em 0; }
    blockquote {
      border-right: 4px solid #aaa;
      padding: 4px 12px;
      margin: 0.8em 0;
      color: #444;
      font-style: italic;
    }
    code {
      font-family: "Courier New", monospace;
      background: #f3f3f3;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.88em;
    }
    pre {
      background: #f6f6f6;
      border: 1px solid #ddd;
      padding: 10px 14px;
      overflow-x: auto;
      margin: 0.8em 0;
    }
    pre code { background: none; padding: 0; }
    pre.plain-text {
      font-family: "Courier New", monospace;
      font-size: 0.88em;
      white-space: pre-wrap;
      word-break: break-word;
      background: none;
      border: none;
      padding: 0;
    }
    table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
    th, td { border: 1px solid #bbb; padding: 6px 10px; text-align: right; }
    th { background: #eee; font-weight: bold; }
    img { max-width: 100%; height: auto; display: block; margin: 0.5em auto; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.2em 0; }
    a { color: #000; text-decoration: underline; }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm 22mm; }
    }
  </style>
</head>
<body>
  <div class="print-title">${escapeHtml(fileName)}</div>
  ${bodyHtml}
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () {
        window.print();
        window.addEventListener("afterprint", function () {
          window.close();
        });
      }, 250);
    });
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const printWin = window.open(blobUrl, "_blank");
  if (!printWin) {
    // Popup blocked — fall back to same-window print via hidden div
    const printRoot = document.getElementById("torah-ide-print-root");
    if (printRoot) {
      printRoot.innerHTML = `<style>${extractBodyStyles(html)}</style><div class="print-title">${escapeHtml(fileName)}</div>${bodyHtml}`;
      window.print();
      window.addEventListener("afterprint", () => { printRoot.innerHTML = ""; }, { once: true });
    }
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractBodyStyles() { return ""; } // placeholder for fallback
