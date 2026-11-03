// Reads the "(Customer)" sheets of the Sunflow_Package_Pricing_*.xlsx workbooks and writes
// src/lib/energy/catalogue.generated.ts. Only customer-safe columns are read (price, rebate, you pay) -
// the Internal sheets with costs and margins are never opened.
//
// Usage: node scripts/import-prices.mjs [folder-with-workbooks]   (default: ../../output)
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folder = path.resolve(process.argv[2] ?? path.join(root, "../../output"));

/** Minimal zip reader: returns a map of entry name -> Buffer (store and deflate only, enough for .xlsx). */
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(local + 26);
    const lelen = buf.readUInt16LE(local + 28);
    const data = buf.subarray(local + 30 + lnlen + lelen, local + 30 + lnlen + lelen + csize);
    files.set(name, method === 0 ? data : inflateRawSync(data));
    p += 46 + nlen + elen + clen;
  }
  return files;
}

const dec = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

function readWorkbook(file) {
  const files = unzip(readFileSync(file));
  const text = (n) => (files.has(n) ? files.get(n).toString("utf8") : "");
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""))
  );
  const rels = text("xl/_rels/workbook.xml.rels");
  const sheets = {};
  for (const m of text("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)) {
    const rel = rels.match(new RegExp(`Id="${m[2]}"[^>]*Target="([^"]*)"|Target="([^"]*)"[^>]*Id="${m[2]}"`));
    const target = ((rel && (rel[1] || rel[2])) || "").replace(/^\/?(xl\/)?/, "");
    const rows = [];
    for (const r of text("xl/" + target).matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = {};
      for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const body = c[3] || "";
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const inline = (body.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
        let val = null;
        if (/t="s"/.test(c[2]) && v != null) val = shared[+v];
        else if (inline != null) val = dec(inline);
        else if (v != null) val = /t="str"/.test(c[2]) ? dec(v) : Number(v);
        if (val != null) cells[c[1]] = val;
      }
      rows.push({ n: +r[1], cells });
    }
    sheets[dec(m[1])] = rows;
  }
  return sheets;
}

const packages = [];
const files = readdirSync(folder).filter((f) => /^Sunflow_Package_Pricing_.+\.xlsx$/.test(f) && !f.startsWith("~$"));
if (files.length === 0) throw new Error(`No Sunflow_Package_Pricing_*.xlsx files found in ${folder}`);

let newest = 0;
for (const file of files) {
  const brand = file.match(/Pricing_(.+)\.xlsx$/)[1];
  newest = Math.max(newest, statSync(path.join(folder, file)).mtimeMs);
  const sheets = readWorkbook(path.join(folder, file));
  for (const [sheetName, rows] of Object.entries(sheets)) {
    if (!/\(Customer\)/.test(sheetName)) continue;
    const kind = sheetName.startsWith("Solar+Battery") ? "solar+battery" : "battery";
    const header = rows.find((r) => Object.values(r.cells).includes("Package"));
    if (!header) continue;
    const col = {};
    for (const [letter, name] of Object.entries(header.cells)) col[name] = letter;
    const need = ["Package", "Inverter", "Battery", "Battery (kWh)", "Total price inc GST", "Government STC rebate", "YOU PAY inc GST"];
    for (const n of need) if (!col[n]) throw new Error(`${file} / ${sheetName}: missing column "${n}"`);
    let seq = 0;
    for (const row of rows.filter((r) => r.n > header.n && r.cells[col.Package])) {
      const c = row.cells;
      const inverter = String(c[col.Inverter] ?? "");
      packages.push({
        id: `${brand}-${kind === "battery" ? "BO" : "SB"}-${String(++seq).padStart(3, "0")}`,
        brand,
        kind,
        name: String(c[col.Package]),
        solarKw: kind === "solar+battery" ? Number(c[col["Solar size (kW)"]]) : 0,
        batteryKwh: Math.round(Number(c[col["Battery (kWh)"]]) * 100) / 100,
        inverter,
        phase: /three phase/i.test(inverter) ? "Three" : /single phase/i.test(inverter) ? "Single" : "",
        battery: String(c[col.Battery] ?? ""),
        panels: kind === "solar+battery" ? String(c[col["Solar panels"]] ?? "") : "",
        price: Math.round(Number(c[col["Total price inc GST"]])),
        rebate: Math.round(Math.abs(Number(c[col["Government STC rebate"]]))),
        youPay: Math.round(Number(c[col["YOU PAY inc GST"]])),
      });
    }
  }
}

const bad = packages.filter((p) => !Number.isFinite(p.batteryKwh) || !Number.isFinite(p.youPay) || p.youPay <= 0);
if (bad.length) throw new Error(`Unreadable rows: ${bad.map((b) => b.id).join(", ")}`);

const out = `// GENERATED by scripts/import-prices.mjs from the Sunflow_Package_Pricing workbooks - do not edit by hand.
// Customer-facing figures only: total price inc GST, government STC rebate and the amount the customer pays.
import type { SystemPackage } from "./types";

export const PRICE_LIST_DATE = ${JSON.stringify(new Date(newest).toISOString().slice(0, 10))};

export const PACKAGES: SystemPackage[] = ${JSON.stringify(packages, null, 2)};
`;
writeFileSync(path.join(root, "src/lib/energy/catalogue.generated.ts"), out);
const brands = [...new Set(packages.map((p) => p.brand))];
console.log(`Imported ${packages.length} packages from ${files.length} workbooks (${brands.join(", ")}).`);
