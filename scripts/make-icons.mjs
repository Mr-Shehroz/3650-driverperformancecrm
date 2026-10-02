// Creates the favicon, Apple icon and PWA icons from public/logo.webp
// Usage: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/logo.webp";
const DARK = { r: 17, g: 17, b: 17, alpha: 1 }; // #111111 (app theme)
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

mkdirSync("public/icons", { recursive: true });

/** Fits the logo inside a square canvas, using `scale` of the canvas size */
async function make(out, size, { scale = 0.9, background = CLEAR } = {}) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);

  console.log("✓", out);
}

// Browser tab favicon (transparent)
await make("src/app/icon.png", 64, { scale: 0.96 });

// iPhone home screen (iOS fills transparent areas with black, so use the theme color)
await make("src/app/apple-icon.png", 180, { scale: 0.78, background: DARK });

// PWA icons (Android / install)
await make("public/icons/icon-192.png", 192, { scale: 0.86, background: DARK });
await make("public/icons/icon-512.png", 512, { scale: 0.86, background: DARK });

// Maskable: Android may crop into a circle, so keep the logo inside the safe area
await make("public/icons/maskable-512.png", 512, { scale: 0.62, background: DARK });

console.log("\nDone. Restart the dev server.");