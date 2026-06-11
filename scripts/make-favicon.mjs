// Genera un favicon cuadrado a partir del pin del logo (recorta el pin, lo centra
// en un cuadrado transparente y reescala con box-filter premultiplicado). Pure JS.
//   node scripts/make-favicon.mjs <src.png> <out.png> [size=256]
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const src = process.argv[2] ?? 'apps/web/public/kaypi-logo.png';
const outPath = process.argv[3] ?? 'apps/web/app/icon.png';
const TARGET = Number(process.argv[4] ?? 256);
const ALPHA_MIN = 16;

const png = PNG.sync.read(readFileSync(src));
const { width: W, height: H, data } = png;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

// 1) columnas con algún píxel opaco → el pin es el primer bloque a la izquierda
const colHas = new Array(W).fill(false);
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (alphaAt(x, y) > ALPHA_MIN) { colHas[x] = true; break; }
let x0 = 0; while (x0 < W && !colHas[x0]) x0++;
let x1 = x0; while (x1 < W && colHas[x1]) x1++; // primer columna transparente tras el pin

// 2) límites verticales del pin dentro de [x0,x1)
let y0 = H, y1 = 0;
for (let x = x0; x < x1; x++) for (let y = 0; y < H; y++) if (alphaAt(x, y) > ALPHA_MIN) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
y1++;
const pw = x1 - x0, ph = y1 - y0;

// 3) cuadrado con padding, pin centrado
const pad = Math.round(Math.max(pw, ph) * 0.14);
const S = Math.max(pw, ph) + pad * 2;
const offX = ((S - pw) / 2) | 0, offY = ((S - ph) / 2) | 0;
const sq = new Uint8Array(S * S * 4);
for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
  const si = ((y0 + y) * W + (x0 + x)) * 4, di = ((offY + y) * S + (offX + x)) * 4;
  sq[di] = data[si]; sq[di + 1] = data[si + 1]; sq[di + 2] = data[si + 2]; sq[di + 3] = data[si + 3];
}

// 4) downscale S→TARGET con box-filter premultiplicado (bordes limpios)
const out = new PNG({ width: TARGET, height: TARGET });
const scale = S / TARGET;
for (let ty = 0; ty < TARGET; ty++) for (let tx = 0; tx < TARGET; tx++) {
  const sx0 = (tx * scale) | 0, sx1 = Math.max(sx0 + 1, ((tx + 1) * scale) | 0);
  const sy0 = (ty * scale) | 0, sy1 = Math.max(sy0 + 1, ((ty + 1) * scale) | 0);
  let r = 0, g = 0, b = 0, aSum = 0, afSum = 0, n = 0;
  for (let sy = sy0; sy < sy1 && sy < S; sy++) for (let sx = sx0; sx < sx1 && sx < S; sx++) {
    const i = (sy * S + sx) * 4, af = sq[i + 3] / 255;
    r += sq[i] * af; g += sq[i + 1] * af; b += sq[i + 2] * af; aSum += sq[i + 3]; afSum += af; n++;
  }
  const di = (ty * TARGET + tx) * 4, outA = Math.round(aSum / n);
  if (afSum < 0.001 || outA < 4) { out.data[di + 3] = 0; }
  else {
    out.data[di] = Math.min(255, Math.round(r / afSum));
    out.data[di + 1] = Math.min(255, Math.round(g / afSum));
    out.data[di + 2] = Math.min(255, Math.round(b / afSum));
    out.data[di + 3] = outA;
  }
}
writeFileSync(outPath, PNG.sync.write(out));
console.log(`pin ${pw}x${ph}@(${x0},${y0}) → cuadrado ${S} → ${TARGET}x${TARGET} · ${outPath}`);
