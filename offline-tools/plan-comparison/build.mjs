// Builds dist/plan-comparison.html: one self-contained file (JS + CSS inlined, no network needed).
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, "src", p);

const js = await build({
  entryPoints: [src("main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" },
});

const cssSource = readFileSync(src("styles.css"), "utf8");
const css = await postcss([tailwind()]).process(cssSource, { from: src("styles.css") });

let html = readFileSync(path.join(root, "index.html"), "utf8");
html = html
  .replace("/*CSS*/", () => css.css)
  .replace("/*JS*/", () => js.outputFiles[0].text.replace(/<\/script/gi, "<\/script"));

mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "plan-comparison.html");
writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
