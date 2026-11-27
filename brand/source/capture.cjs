// Usage: node capture.js <mode> <width> <height> <frames> <outDir>
const { chromium } = require(process.env.PW)
const path = require('path'), fs = require('fs')
const [mode, w, h, frames, out] = process.argv.slice(2)
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto('file://' + path.resolve('/home/user/routiq/brand/source/render.html') + `?mode=${mode}&w=${w}&h=${h}${process.env.EXTRA ? `&${process.env.EXTRA}` : ""}`)
  await p.evaluate(() => window.ready)
  const n = +frames
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.draw(t), i / n)
    await p.locator('canvas').screenshot({ path: path.join(out, `f${String(i).padStart(3, '0')}.png`) })
  }
  if (errs.length) console.log('ERRORS', errs)
  await b.close()
})()
