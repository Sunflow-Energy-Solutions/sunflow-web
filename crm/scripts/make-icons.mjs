// Builds the app icons from the sun emblem in the Sunflow logo. Run: npm run icons
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const logoFile = path.resolve(here, "../../public/images/logo-transparent.png");
const out = (f) => path.resolve(here, "../public", f);
const NAVY = { r: 10, g: 23, b: 48, alpha: 1 };

// The full logo is wide and its lettering is unreadable at icon size, so use only the sun emblem at the left.
const trimmed = await sharp(logoFile).trim().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = trimmed.info;
const emblem = await sharp(trimmed.data)
  .extract({ left: 0, top: 0, width: Math.round(w * 0.32), height: Math.round(h * 0.88) })
  .trim()
  .toBuffer();

async function icon(size, file, scale) {
  const inner = Math.round(size * scale);
  const mark = await sharp(emblem).resize(inner, inner, { fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(out(file));
}

await icon(192, "icon-192.png", 0.72);
await icon(512, "icon-512.png", 0.72);
await icon(512, "icon-maskable-512.png", 0.55); // extra padding: Android crops maskable icons to a circle
await icon(180, "apple-touch-icon.png", 0.72);
console.log("icons written");
