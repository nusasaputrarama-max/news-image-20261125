// The World in One Day — Wednesday 25 November 2026.
// A make.fun news-image entry: draws a 1024x1024 newspaper front page that
// sums up 25 November 2026 world news and writes it to /output/entry.png.
// Node 22, standard library only. No network, no clock, no randomness:
// every run draws the same pixels and writes the same bytes.
//
// Headlines verified against wire reports of 25 November 2026:
//  - Nvidia fell ~7% as the AI sell-off spread; Nikkei fell 2.8%.
//  - Two tankers struck mines in the Strait of Hormuz; a third US carrier
//    headed for the Gulf.
//  - COP31 climate talks in Antalya collapsed with no final agreement.
//  - A US jury convicted Huawei on 10 of 12 counts; racketeering acquitted.
//  - The Crimean Bridge partly collapsed in a seven-stage Ukrainian strike.
//  - Gunmen held ~25 hostages in a supermarket siege in Cartagena.
//  - Shenzhou 24 carried Pakistan's first astronaut to Tiangong.
//  - CAS reinstated Senegal as 2025 Africa Cup of Nations champions.

import { deflateSync } from 'node:zlib';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Canvas: a plain RGBA buffer, 1024 x 1024.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 4);

type RGB = [number, number, number];

const PAPER: RGB = [251, 248, 241];
const INK: RGB = [20, 20, 20];
const RED: RGB = [179, 39, 30];
const BLUE: RGB = [29, 78, 137];
const TEAL: RGB = [15, 107, 92];
const GOLD: RGB = [176, 132, 22];
const GREY: RGB = [110, 110, 105];
const LIGHT: RGB = [238, 233, 222];
const WHITE: RGB = [255, 255, 255];
const DARKBLUE: RGB = [23, 48, 84];
const ORANGE: RGB = [214, 106, 24];
const GREEN: RGB = [46, 125, 50];

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = 255;
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) setPixel(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) setPixel(x, y, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  for (let d = 0; d < t; d++) {
    line(x0, y0 + d, x1, y1 + d, c);
    line(x0 + d, y0, x1 + d, y1, c);
  }
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

function ring(cx: number, cy: number, r: number, c: RGB): void {
  circle(cx, cy, r, c);
  circle(cx, cy, r - 1, c);
  circle(cx, cy, r - 2, c);
}

// ---------------------------------------------------------------------------
// Tiny 5x7 bitmap font. Uppercase, digits and common punctuation.
// Each glyph is 7 rows of 5 bits, joined with '/'.
// ---------------------------------------------------------------------------

const FONT: Record<string, string> = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01110/10001/10000/10000/10000/10001/01110',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01110/10001/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '01110/00100/00100/00100/00100/00100/01110',
  J: '00111/00010/00010/00010/00010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/11011/10001',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00110/01000/10000/11111',
  '3': '11111/00010/00100/00010/00001/10001/01110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/11110/00001/00001/10001/01110',
  '6': '00110/01000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00010/01100',
  ' ': '00000/00000/00000/00000/00000/00000/00000',
  '.': '00000/00000/00000/00000/00000/01100/01100',
  ',': '00000/00000/00000/00000/01100/00100/01000',
  ':': '00000/01100/01100/00000/01100/01100/00000',
  ';': '00000/01100/01100/00000/01100/00100/01000',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '?': '01110/10001/00001/00110/00100/00000/00100',
  '-': '00000/00000/00000/01110/00000/00000/00000',
  '/': '00001/00010/00010/00100/01000/01000/10000',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  '%': '11001/11010/00010/00100/01000/01011/10011',
  "'": '00100/00100/01000/00000/00000/00000/00000',
  '"': '01010/01010/00000/00000/00000/00000/00000',
  '&': '01100/10010/10100/01000/10101/10010/01101',
  '+': '00000/00100/00100/11111/00100/00100/00000',
  '=': '00000/00000/11111/00000/11111/00000/00000',
  $: '00100/01111/10100/01110/00101/11110/00100',
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const glyph = FONT[ch] ?? FONT[' '];
    const rows = glyph.split('/');
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (rows[r][col] === '1') {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap to a pixel width.
function wrap(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (textWidth(next, scale) <= maxWidth) {
      cur = next;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Story icons: small geometric pictograms, one per story.
// ---------------------------------------------------------------------------

function iconChart(x: number, y: number, s: number): void {
  // Falling market line, red.
  const pts: Array<[number, number]> = [
    [0, 8],
    [14, 14],
    [28, 12],
    [42, 26],
    [56, 40],
    [70, 52],
    [84, 62],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    thickLine(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], 3, RED);
  }
  for (const p of pts) fillCircle(x + p[0], y + p[1], 3, RED);
  line(x, y + 70, x + 88, y + 70, INK);
  line(x, y, x, y + 70, INK);
}

function iconTanker(x: number, y: number): void {
  fillRect(x + 6, y + 34, 76, 18, DARKBLUE); // hull
  fillRect(x + 52, y + 18, 12, 16, DARKBLUE); // stack
  fillRect(x + 14, y + 26, 22, 8, BLUE); // deck house
  for (let i = 0; i < 3; i++) {
    const wy = y + 60 + i * 6;
    for (let xx = x; xx < x + 88; xx += 16) {
      line(xx, wy, xx + 8, wy + 4, BLUE);
      line(xx + 8, wy + 4, xx + 16, wy, BLUE);
    }
  }
}

function iconGlobe(x: number, y: number): void {
  ring(x + 44, y + 40, 34, TEAL);
  line(x + 10, y + 28, x + 78, y + 28, TEAL);
  line(x + 10, y + 52, x + 78, y + 52, TEAL);
  line(x + 44, y + 6, x + 44, y + 74, TEAL);
  // Crack: the talks broke down.
  thickLine(x + 18, y + 62, x + 40, y + 40, 3, RED);
  thickLine(x + 40, y + 40, x + 34, y + 22, 3, RED);
}

function iconChip(x: number, y: number): void {
  fillRect(x + 22, y + 22, 44, 44, DARKBLUE);
  fillRect(x + 32, y + 32, 24, 24, BLUE);
  for (let i = 0; i < 4; i++) {
    const p = 26 + i * 12;
    fillRect(x + p, y + 12, 4, 10, DARKBLUE);
    fillRect(x + p, y + 66, 4, 10, DARKBLUE);
    fillRect(x + 12, y + p, 10, 4, DARKBLUE);
    fillRect(x + 66, y + p, 10, 4, DARKBLUE);
  }
  // Guilty verdict tick.
  thickLine(x + 34, y + 44, x + 41, y + 51, 3, WHITE);
  thickLine(x + 41, y + 51, x + 56, y + 34, 3, WHITE);
}

function iconBridge(x: number, y: number): void {
  // Deck with a gap in the middle: partly collapsed.
  thickLine(x + 4, y + 56, x + 38, y + 56, 4, INK);
  thickLine(x + 50, y + 56, x + 84, y + 56, 4, INK);
  // Arch, broken at the gap.
  line(x + 6, y + 56, x + 22, y + 30, INK);
  line(x + 22, y + 30, x + 38, y + 56, INK);
  line(x + 50, y + 56, x + 66, y + 30, INK);
  line(x + 66, y + 30, x + 82, y + 56, INK);
  // Fallen span.
  line(x + 38, y + 56, x + 44, y + 72, RED);
  line(x + 44, y + 72, x + 50, y + 56, RED);
  vline(x + 12, y + 56, y + 76, INK);
  vline(x + 76, y + 56, y + 76, INK);
}

function iconBuilding(x: number, y: number): void {
  fillRect(x + 22, y + 12, 44, 62, DARKBLUE);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      fillRect(x + 28 + c * 13, y + 20 + r * 14, 7, 8, GOLD);
    }
  }
  fillRect(x + 38, y + 62, 12, 12, INK);
  // Warning triangle.
  line(x + 70, y + 20, x + 82, y + 40, RED);
  line(x + 82, y + 40, x + 58, y + 40, RED);
  line(x + 58, y + 40, x + 70, y + 20, RED);
  drawText('!', x + 67, y + 27, 1, RED);
}

function iconRocket(x: number, y: number): void {
  // Body.
  fillRect(x + 36, y + 12, 16, 40, INK);
  line(x + 36, y + 12, x + 44, y + 2, INK);
  line(x + 52, y + 12, x + 44, y + 2, INK);
  fillRect(x + 28, y + 40, 8, 14, RED);
  fillRect(x + 52, y + 40, 8, 14, RED);
  // Flame.
  line(x + 44, y + 52, x + 38, y + 66, ORANGE);
  line(x + 44, y + 52, x + 50, y + 66, ORANGE);
  line(x + 44, y + 52, x + 44, y + 70, ORANGE);
  // Stars.
  fillRect(x + 8, y + 10, 3, 3, GOLD);
  fillRect(x + 76, y + 22, 3, 3, GOLD);
  fillRect(x + 14, y + 58, 3, 3, GOLD);
}

function iconTrophy(x: number, y: number): void {
  fillRect(x + 28, y + 12, 32, 26, GOLD); // cup
  ring(x + 22, y + 20, 8, GOLD); // left handle
  ring(x + 66, y + 20, 8, GOLD); // right handle
  fillRect(x + 40, y + 38, 8, 16, GOLD); // stem
  fillRect(x + 28, y + 54, 32, 8, GOLD); // base
  fillRect(x + 22, y + 62, 44, 6, GOLD);
}

// ---------------------------------------------------------------------------
// PNG encoder: RGBA, filter 0, zlib level 9, standard CRC32.
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Layout: newspaper front page.
// ---------------------------------------------------------------------------

interface Story {
  kicker: string;
  headline: string;
  body: string;
  icon: (x: number, y: number) => void;
  accent: RGB;
}

const STORIES: Story[] = [
  {
    kicker: 'GULF CRISIS',
    headline: 'TWO TANKERS HIT BY MINES IN HORMUZ',
    body: 'TWO TANKERS ABLAZE; THIRD US CARRIER SAILS IN',
    icon: iconTanker,
    accent: BLUE,
  },
  {
    kicker: 'CLIMATE',
    headline: 'COP31 COLLAPSES WITHOUT A DEAL',
    body: 'TALKS FAIL ON FOSSIL FUELS; NO DEAL IN ANTALYA',
    icon: iconGlobe,
    accent: TEAL,
  },
  {
    kicker: 'US-CHINA TECH',
    headline: 'HUAWEI GUILTY ON 10 OF 12 COUNTS',
    body: 'JURY CONVICTS ON FRAUD; RACKETEERING ACQUITTED',
    icon: iconChip,
    accent: DARKBLUE,
  },
  {
    kicker: 'UKRAINE',
    headline: 'CRIMEAN BRIDGE PARTLY COLLAPSES',
    body: 'SEVEN-STAGE STRIKE ON BRIDGE; SHIP HIT OFF LIBYA',
    icon: iconBridge,
    accent: INK,
  },
  {
    kicker: 'COLOMBIA',
    headline: 'GUNMEN TAKE 25 HOSTAGES IN MARKET',
    body: 'SIEGE IN CARTAGENA AFTER FAILED TRUCK ROBBERY',
    icon: iconBuilding,
    accent: RED,
  },
  {
    kicker: 'SPACE',
    headline: "PAKISTAN'S FIRST ASTRONAUT IN SPACE",
    body: 'SHENZHOU 24 CARRIES ZEESHAN ALI TO TIANGONG',
    icon: iconRocket,
    accent: ORANGE,
  },
];

const M = 40; // page margin
const CW = W - 2 * M; // content width

function drawPanel(s: Story, x: number, y: number, w: number, h: number): void {
  // Panel frame.
  fillRect(x, y, w, 2, INK);
  const tx = x + 108;
  const tw = w - 108 - 12;
  drawText(s.kicker, tx, y + 14, 2, s.accent);
  const headLines = wrap(s.headline, tw, 3);
  let hy = y + 36;
  for (const ln of headLines.slice(0, 2)) {
    drawText(ln, tx, hy, 3, INK);
    hy += 24;
  }
  const bodyLines = wrap(s.body, tw, 2);
  let by = hy + 4;
  for (const ln of bodyLines.slice(0, 2)) {
    drawText(ln, tx, by, 2, GREY);
    by += 16;
  }
  s.icon(x + 10, y + h / 2 - 44);
}

function draw(): void {
  fillRect(0, 0, W, H, PAPER);

  // Masthead.
  fillRect(0, 0, W, 10, RED);
  drawCentered('THE WORLD IN ONE DAY', W / 2, 30, 7, INK);
  // Date band.
  fillRect(M, 96, CW, 34, INK);
  drawCentered('WEDNESDAY, 25 NOVEMBER 2026', W / 2, 104, 3, WHITE);
  fillRect(M, 140, CW, 4, INK);

  // Lead story: markets.
  const ly = 158;
  drawText('MARKETS', M + 16, ly + 14, 2, RED);
  drawText('CHIP ROUT DEEPENS', M + 16, ly + 40, 5, INK);
  drawText('NVIDIA FALLS 7% AS AI SELL-OFF SPREADS', M + 16, ly + 92, 2, INK);
  drawText('NIKKEI DROPS 2.8%; NASDAQ NEARS BEAR MARKET', M + 16, ly + 114, 2, GREY);
  drawText('NVDA -7%', M + 16, ly + 142, 2, RED);
  // Chart on the right of the lead.
  const chartX = W - M - 300;
  const chartY = ly + 20;
  fillRect(chartX - 12, chartY - 12, 288, 168, LIGHT);
  iconChart(chartX, chartY + 8, 1);
  drawText('CHIP STOCKS, 25 NOV', chartX + 8, chartY + 138, 2, GREY);
  fillRect(M, ly + 176, CW, 2, INK);

  // Grid: 2 columns x 3 rows.
  const gw = Math.floor((CW - 24) / 2);
  const gh = 146;
  const gy0 = ly + 196;
  for (let i = 0; i < 6; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawPanel(STORIES[i], M + col * (gw + 24), gy0 + row * (gh + 12), gw, gh);
  }

  // Bottom strip: sport.
  const sy = gy0 + 3 * (gh + 12) + 4;
  fillRect(M, sy, CW, 2, INK);
  drawText('SPORT', M + 108, sy + 14, 2, GOLD);
  drawText('SENEGAL REINSTATED AS AFCON CHAMPIONS', M + 108, sy + 36, 3, INK);
  drawText('CAS OVERTURNS RULING; SENEGAL KEEP THE 2025 AFRICA CUP TITLE', M + 108, sy + 64, 2, GREY);
  iconTrophy(M + 10, sy + 6);

  // Footer.
  drawCentered('COMPILED FROM WIRE REPORTS  -  ALL TIMES UTC', W / 2, H - 26, 1, GREY);
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

draw();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, encodePNG());
chmodSync(outPath, 0o644);
