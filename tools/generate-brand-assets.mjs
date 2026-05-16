import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE_SVG = path.join(ROOT, 'public', 'brand', 'oslerlogo.svg')
const SOURCE_PNG = path.join(ROOT, 'public', 'brand', 'oslerlogo.png')
const OUT_DIR = path.join(ROOT, 'public', 'brand', 'generated')
const DOC_PATH = path.join(ROOT, 'BRANDING_ASSETS.md')

const SIZES = [16, 32, 64, 128, 180, 192, 256, 512, 1024]

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function writeFile(p, buf) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, buf)
  return fs.statSync(p).size
}

const outputs = []

for (const size of SIZES) {
  const pngPath = path.join(OUT_DIR, 'png', `oslerlogo-${size}x${size}.png`)
  const webpPath = path.join(OUT_DIR, 'webp', `oslerlogo-${size}x${size}.webp`)
  const jpgPath = path.join(OUT_DIR, 'jpg', `oslerlogo-${size}x${size}.jpg`)

  const pngBuf = await sharp(SOURCE_PNG)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  const webpBuf = await sharp(pngBuf).webp({ quality: 82, effort: 6 }).toBuffer()
  const jpgBuf = await sharp(pngBuf)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  outputs.push({ path: pngPath, format: 'png', size, bytes: writeFile(pngPath, pngBuf) })
  outputs.push({ path: webpPath, format: 'webp', size, bytes: writeFile(webpPath, webpBuf) })
  outputs.push({ path: jpgPath, format: 'jpg', size, bytes: writeFile(jpgPath, jpgBuf) })
}

const lines = []
lines.push('# Branding Assets (Osler Notes)')
lines.push('')
lines.push('Fonte única: `public/brand/oslerlogo.svg` (wrapper) e `public/brand/oslerlogo.png` (origem raster)') 
lines.push('')
lines.push('Os arquivos abaixo são derivados automaticamente (PNG/WebP preservam transparência; JPG usa fundo branco).')
lines.push('')
lines.push('| Arquivo | Formato | Dimensões | Tamanho | Uso recomendado |')
lines.push('|---|---:|---:|---:|---|')

for (const out of outputs.sort((a, b) => a.format.localeCompare(b.format) || a.size - b.size)) {
  const rel = path.relative(ROOT, out.path).replaceAll('\\', '/')
  const dims = `${out.size}x${out.size}`
  const use =
    out.size <= 32
      ? 'Favicon / UI muito pequena'
      : out.size <= 128
        ? 'UI (ícone) / PWA'
        : out.size <= 512
          ? 'PWA / e-mail (fallback raster)'
          : 'Marketing / export alta resolução'
  lines.push(`| \`${rel}\` | ${out.format.toUpperCase()} | ${dims} | ${formatKB(out.bytes)} | ${use} |`)
}

lines.push('')
lines.push('## Fallback recomendado (web)')
lines.push('')
lines.push('Use SVG como principal e forneça WebP/PNG como alternativas quando necessário.')
lines.push('')

writeFile(DOC_PATH, Buffer.from(lines.join('\n'), 'utf8'))

function icoFromPngs(pngBuffers) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngBuffers.length, 4)

  const entries = []
  let offset = 6 + pngBuffers.length * 16
  for (const { size, png } of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry[0] = size === 256 ? 0 : size
    entry[1] = size === 256 ? 0 : size
    entry[2] = 0
    entry[3] = 0
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length >>> 0, 8)
    entry.writeUInt32LE(offset >>> 0, 12)
    entries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.png)])
}

const png16 = path.join(OUT_DIR, 'png', 'oslerlogo-16x16.png')
const png32 = path.join(OUT_DIR, 'png', 'oslerlogo-32x32.png')
const png180 = path.join(OUT_DIR, 'png', 'oslerlogo-180x180.png')
const png192 = path.join(OUT_DIR, 'png', 'oslerlogo-192x192.png')
const png512 = path.join(OUT_DIR, 'png', 'oslerlogo-512x512.png')

fs.copyFileSync(png16, path.join(ROOT, 'public', 'favicon-16.png'))
fs.copyFileSync(png32, path.join(ROOT, 'public', 'favicon-32.png'))
fs.copyFileSync(png180, path.join(ROOT, 'public', 'apple-touch-icon.png'))
fs.copyFileSync(png192, path.join(ROOT, 'public', 'pwa-192.png'))
fs.copyFileSync(png512, path.join(ROOT, 'public', 'pwa-512.png'))
fs.copyFileSync(SOURCE_SVG, path.join(ROOT, 'public', 'favicon.svg'))

const ico = icoFromPngs([
  { size: 16, png: fs.readFileSync(png16) },
  { size: 32, png: fs.readFileSync(png32) },
])
writeFile(path.join(ROOT, 'public', 'favicon.ico'), ico)

console.log(`Generated ${outputs.length} files into ${path.relative(ROOT, OUT_DIR)} and wrote ${path.basename(DOC_PATH)}`)
