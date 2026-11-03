// Builds dist/plan-comparison.html: one self-contained file (JS + CSS + workers inlined, no network needed).
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, "src", p);

// Background worker that runs the battery/solar calculations.
const engineWorker = await build({
  entryPoints: [src("lib/engine.worker.ts")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
});

// pdf.js's worker, used to read uploaded bills.
const pdfWorker = readFileSync(path.join(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"), "utf8");

const js = await build({
  entryPoints: [src("main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  alias: { "@": path.join(root, "src") },
  define: {
    "process.env.NODE_ENV": '"production"',
    __ENGINE_WORKER__: JSON.stringify(engineWorker.outputFiles[0].text),
    __PDF_WORKER__: JSON.stringify(pdfWorker),
  },
  loader: { ".css": "empty" },
});

const cssSource = readFileSync(src("styles.css"), "utf8");
const css = await postcss([tailwind()]).process(cssSource, { from: src("styles.css") });

const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
let html = readFileSync(path.join(root, "index.html"), "utf8");
html = html
  .replace("/*CSS*/", () => css.css)
  .replace("/*JS*/", () => safe(js.outputFiles[0].text));

mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "plan-comparison.html");
writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
