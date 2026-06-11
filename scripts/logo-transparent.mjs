// Quita el fondo blanco del logo por flood-fill desde los bordes.
// Preserva blancos internos (el check del pin) que no tocan el borde.
// Pure JS (pngjs) — sin binarios nativos.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const path = process.argv[2] ?? 'apps/web/public/kaypi-logo.png';
const TH = 240; // near-white

const png = PNG.sync.read(readFileSync(path)); // normaliza a RGBA
const { width: w, height: h, data } = png;
const c = 4;
const N = w * h;
const visited = new Uint8Array(N);
const isWhite = (p) => data[p * c] >= TH && data[p * c + 1] >= TH && data[p * c + 2] >= TH;

const stack = [];
for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); }
for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + (w - 1)); }

let cleared = 0;
while (stack.length) {
  const p = stack.pop();
  if (visited[p]) continue;
  visited[p] = 1;
  if (!isWhite(p)) continue;
  data[p * c + 3] = 0;
  cleared++;
  const x = p % w, y = (p / w) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - w);
  if (y < h - 1) stack.push(p + w);
}

writeFileSync(path, PNG.sync.write(png));
console.log(`listo · ${cleared} px a transparente (${((cleared / N) * 100).toFixed(0)}% del lienzo)`);
