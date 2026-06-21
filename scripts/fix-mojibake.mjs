// One-off de-mojibake fixer: repairs UTF-8 text that was decoded as cp1252 and
// re-encoded as UTF-8. Only converts well-formed UTF-8-as-cp1252 byte runs, so
// already-correct Vietnamese (code points > 255) is left untouched.
import fs from 'fs';

const cp1252 = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020,
  0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152,
  0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022,
  0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a,
  0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};
const byteToCp = (b) => (b >= 0x80 && b <= 0x9f ? (cp1252[b] ?? b) : b);
const cpToByte = new Map();
for (let b = 0; b < 256; b++) cpToByte.set(byteToCp(b), b);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chr = (b) => String.fromCodePoint(byteToCp(b));
const cls = (lo, hi) => {
  let s = '';
  for (let b = lo; b <= hi; b++) s += escapeRe(chr(b));
  return s;
};
const C = cls(0x80, 0xbf);
const L2 = cls(0xc2, 0xdf);
const L3 = cls(0xe0, 0xef);
const re = new RegExp('[' + L3 + '][' + C + '][' + C + ']|[' + L2 + '][' + C + ']', 'g');

function decodeRun(m) {
  const bytes = [...m].map((ch) => cpToByte.get(ch.codePointAt(0)));
  if (bytes.some((b) => b === undefined)) return m;
  const out = Buffer.from(bytes).toString('utf8');
  if (out.includes('�')) return m; // unsafe decode, keep original
  return out;
}

const markers = /Ã|Â|á»|áº|Ä‘|Æ°|â€/g;
const files = process.argv.slice(2);
let changed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const fixed = src.replace(re, decodeRun);
  if (fixed !== src) {
    fs.writeFileSync(f, fixed);
    const before = (src.match(markers) || []).length;
    const after = (fixed.match(markers) || []).length;
    console.log('FIXED', f.padEnd(46), 'markers', before, '->', after);
    changed++;
  } else {
    console.log('skip ', f);
  }
}
console.log('--- files changed:', changed);
