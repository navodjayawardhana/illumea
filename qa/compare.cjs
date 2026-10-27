// Visual QA for the React clone of illumea.lk.
//
// Screenshots every route on the live site and on the local clone the same way, then diffs them:
// whole page (percent of differing pixels, height difference, horizontal bands that differ) and
// section by section (Elementor top-level sections matched by data-id, so a section that grew by
// 40px is named instead of poisoning every pixel below it).
//
// Usage (from D:/eSupportTechnologies/illumea):
//   node qa/compare.cjs                      all pages, desktop + mobile
//   node qa/compare.cjs --pages=home,shop    some pages
//   node qa/compare.cjs --vp=d               desktop only (d = 1440x900, m = 390x844 @2x)
//   node qa/compare.cjs --refresh-live       re-capture the live site (otherwise cached in qa/out/live)
//   node qa/compare.cjs --refresh-live=terms re-capture only these live pages
//   node qa/compare.cjs --baseline=reference diff against qa/reference instead of the masked live capture
//   node qa/compare.cjs --base=http://127.0.0.1:5199   clone URL (started automatically if not up)
//   node qa/compare.cjs --crops=4            side-by-side crops per page (worst bands)
//   node qa/compare.cjs --report-only        rebuild report.md from results.json (no browser)
//
// Output in qa/out/: clone/*.png, live/*.png (masked live capture), diff/*.png, crops/*.png,
// results.json and report.md. qa/reference is never written.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { spawn, execSync } = require('child_process')
const { chromium } = require('D:/eSupportTechnologies/QB-assets/frontend/node_modules/playwright')
const { PNG } = require('D:/eSupportTechnologies/QB-assets/frontend/node_modules/pngjs')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(__dirname, 'out')
const REF = path.join(__dirname, 'reference')
const LIVE = 'https://illumea.lk'
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : (process.argv.includes('--' + k) ? true : d) }
const BASE = arg('base', 'http://127.0.0.1:5199')
const BASELINE = arg('baseline', 'live')
const REFRESH = arg('refresh-live', false) // true = all, or a list: --refresh-live=terms,about
const NCROPS = +arg('crops', 3)
const PRODUCT_SLUG = 'broghtning-night-cream-50g'
const LIVE_PRODUCT_ID = 934

const PAGES = {
  home: '/', shop: '/shop/', product: `/product/${PRODUCT_SLUG}/`, about: '/about-us/', contact: '/contact-us/',
  cart: '/cart/', 'cart-filled': '/cart/', 'checkout-filled': '/checkout/', account: '/my-account/',
  refund: '/refund-policy/', terms: '/terms-and-conditions/', privacy: '/privacy-policy-2/',
}
const VIEWPORTS = {
  d: { viewport: { width: 1440, height: 900 }, isMobile: false, deviceScaleFactor: 1 },
  m: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
}
const pageList = arg('pages') ? String(arg('pages')).split(',') : Object.keys(PAGES)
const vpList = arg('vp') ? String(arg('vp')).split(',') : ['d', 'm']

// Dynamic parts of the live site, treated identically on both sides. Documented in report.md.
// Hidden: fixed overlays that are not part of the page design and vary by visit.
const HIDE_CSS = `
  [class*="cookieadmin"], [id^="cookieadmin"],
  .gtranslate_wrapper, .gt_float_switcher, [id^="gt-wrapper"], .goog-te-banner-frame, #goog-gt-tt,
  .swiper-notification { visibility: hidden !important; }
`
// Masked (painted a flat colour, layout kept): in-flow content that changes on its own.
// WooCommerce shuffles "Related products" on every request, so live never shows the same four
// twice; each card is masked on both sides (the grid, its spacing and the heading still compare).
const MASKS = [
  'time', '.elementor-countdown-wrapper', 'section.related.products ul.products > li.product',
]
const MASK_COLOR = '#FF00FF'

for (const d of ['clone', 'live', 'diff', 'crops']) fs.mkdirSync(path.join(OUT, d), { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// The live host sometimes holds one request open for minutes; 'load' then never fires. Wait for
// the DOM, then give 'load' a bounded chance, and retry the navigation once.
async function go(page, url) {
  for (let i = 0; ; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      try { await page.waitForLoadState('load', { timeout: 45000 }) } catch { /* settle() scrolls and waits anyway */ }
      return
    } catch (e) {
      if (i >= 2) throw e
      // Another agent may restart the dev server mid-run; bring one back up and retry.
      if (/ERR_CONNECTION_REFUSED/.test(e.message) && url.startsWith(BASE)) await ensureServer()
      else await sleep(5000)
    }
  }
}

function reachable(url) {
  return new Promise((res) => {
    const req = http.get(url, (r) => { r.resume(); res(r.statusCode < 500) })
    req.on('error', () => res(false)); req.setTimeout(3000, () => { req.destroy(); res(false) })
  })
}

const startedServers = []
async function ensureServer() {
  if (await reachable(BASE + '/')) return null
  console.log('starting vite on', BASE)
  const port = new URL(BASE).port
  const child = spawn('npx', ['vite', '--port', port, '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, shell: true, env: { ...process.env, VITE_DEMO_PRODUCTS: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const log = fs.createWriteStream(path.join(OUT, 'vite.log'))
  child.stdout.pipe(log); child.stderr.pipe(log)
  startedServers.push(child)
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await reachable(BASE + '/')) return child }
  throw new Error('vite did not come up on ' + BASE)
}
function stopServer(child) {
  if (!child) return
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); else child.kill() } catch { /* already gone */ }
}

function expectedBodyClass(name) {
  const f = path.join(ROOT, 'capture', name + '.rendered.html')
  if (!fs.existsSync(f)) return []
  const m = fs.readFileSync(f, 'utf8').match(/<body[^>]*class="([^"]*)"/)
  return m ? m[1].split(/\s+/).filter(Boolean) : []
}

// Same sequence on both sides: load, settle, scroll the whole page (lazy images, entrance
// animations), back to top, settle, freeze sliders.
async function settle(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }) } catch { /* long-polling scripts */ }
  await page.waitForTimeout(1000)
  await page.evaluate(async () => {
    // 250px every 200ms: at 500px/100ms Elementor's entrance trigger misses widgets at random on
    // both sides (19 left invisible on live mobile home), so the same section differed run to run.
    for (let y = 0; y < document.documentElement.scrollHeight; y += 250) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)) }
    window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 800))
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(3000)
  // A fade carousel caught mid-transition keeps fading after slideTo(…, 0): the CSS transition
  // already in flight is not cancelled. Zero the durations first, and run the freeze twice.
  for (let pass = 0; pass < 2; pass++) await page.evaluate(() => {
    document.querySelectorAll('.swiper-wrapper, .swiper-slide').forEach((el) => { el.style.transitionDuration = '0ms'; el.style.transitionDelay = '0ms' })
    const all = new Set()
    document.querySelectorAll('.swiper, .swiper-container, .swiper-container-initialized, .swiper-initialized').forEach((el) => all.add(el))
    const inst = new Set(window.__qaSwipers || [])
    all.forEach((el) => { if (el.swiper) inst.add(el.swiper); const j = window.jQuery && window.jQuery(el).data('swiper'); if (j) inst.add(j) })
    inst.forEach((s) => {
      if (!s || s.destroyed) return
      try { s.autoplay && s.autoplay.stop && s.autoplay.stop() } catch { /* */ }
      try { if (s.params && s.params.loop && s.slideToLoop) s.slideToLoop(0, 0, false); else s.slideTo(0, 0, false) } catch { /* */ }
    })
    window.scrollTo(0, 0)
  })
  // After the freeze, because moving a carousel is what makes its lazy slides fetch their images.
  // A lazy Elementor background that has not arrived yet leaves a flat grey hero on one side only
  // (seen on live terms-m). Wait until every <img> and every CSS background image has decoded.
  await page.evaluate(async () => {
    // Back at the top, a carousel slide further down that the freeze just revealed is off-screen,
    // so native lazy loading never fetches it: live showed blank slides the clone had loaded.
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager' })
    const urls = new Set()
    document.querySelectorAll('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage
      if (bg && bg !== 'none') for (const m of bg.matchAll(/url\(["']?([^"')]+)/g)) urls.add(m[1])
    })
    const imgs = [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r }))
    const bgs = [...urls].map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u }))
    await Promise.race([Promise.all([...imgs, ...bgs]), new Promise((r) => setTimeout(r, 15000))])
  })
  await page.waitForTimeout(500)
  await page.waitForTimeout(600)
}

async function sections(page) {
  return page.evaluate(() => {
    const sel = '.elementor-location-header, .elementor-location-footer, header#masthead, footer#colophon, .ehf-header #masthead, ' +
      '.elementor-top-section, .e-con.e-parent, .woocommerce-notices-wrapper, div.product, ul.products, .woocommerce-cart-form, ' +
      '.cart-collaterals, .cart-empty, form.checkout, .woocommerce-form-login, .woocommerce-MyAccount-content'
    const seen = new Map()
    const out = []
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.height < 2 || r.width < 2) return
      const base = el.getAttribute('data-id') ? 'data-id=' + el.getAttribute('data-id')
        : el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + (el.className || '').toString().trim().split(/\s+/)[0]
      const n = seen.get(base) || 0; seen.set(base, n + 1)
      out.push({ key: n ? base + '#' + n : base, y: Math.round(r.top + window.scrollY), h: Math.round(r.height), x: Math.round(r.left), w: Math.round(r.width) })
    })
    return out
  })
}

async function shoot(page, file) {
  await page.screenshot({
    path: file, fullPage: true, animations: 'disabled', caret: 'hide', style: HIDE_CSS,
    mask: MASKS.map((s) => page.locator(s)), maskColor: MASK_COLOR, timeout: 120000,
  })
}

async function clickLinkTo(page, suffix, extraSel) {
  return page.evaluate(([suffix, extraSel]) => {
    const cands = [...document.querySelectorAll(extraSel ? extraSel + ', a[href]' : 'a[href]')]
    const el = (extraSel && document.querySelector(extraSel)) || cands.find((a) => {
      try { return new URL(a.href, location.href).pathname === suffix && a.offsetParent !== null } catch { return false }
    })
    if (!el) return false
    el.click(); return true
  }, [suffix, extraSel || null])
}

// One side (live or clone), one viewport, all requested pages.
async function captureSide(browser, side, vp, list) {
  const origin = side === 'live' ? LIVE : BASE
  const results = {}
  const opts = VIEWPORTS[vp]
  const mkctx = async () => {
    const c = await browser.newContext({ ...opts, ignoreHTTPSErrors: true })
    // Record every Swiper ever constructed: el.swiper only names the latest, so a carousel
    // initialised twice keeps a second, invisible autoplay running after the freeze.
    await c.addInitScript(() => {
      window.__qaSwipers = []
      let real
      Object.defineProperty(window, 'Swiper', {
        configurable: true,
        get() { return real },
        set(S) {
          if (typeof S !== 'function' || S.__qa) { real = S; return }
          const W = function (...a) { const inst = new S(...a); window.__qaSwipers.push(inst); return inst }
          W.prototype = S.prototype; Object.setPrototypeOf(W, S); W.__qa = true
          real = W
        },
      })
    })
    return c
  }
  const watch = (page, rec) => {
    page.on('console', (m) => { if (m.type() === 'error' && rec.consoleErrors.length < 15) rec.consoleErrors.push(m.text().slice(0, 200)) })
    page.on('pageerror', (e) => { if (rec.consoleErrors.length < 15) rec.consoleErrors.push('pageerror: ' + String(e.message).slice(0, 200)) })
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin) && rec.failed.length < 30) rec.failed.push(r.status() + ' ' + r.url().replace(origin, '')) })
    page.on('requestfailed', (r) => { if (r.url().startsWith(origin) && rec.failed.length < 30) rec.failed.push('failed ' + r.url().replace(origin, '')) })
  }
  const finish = async (page, name, rec) => {
    await settle(page)
    rec.dom = await page.evaluate(() => ({
      bodyClass: document.body.className, title: document.title, path: location.pathname,
      hasElementor: !!document.querySelector('.elementor'), cartItems: document.querySelectorAll('.cart_item, .woocommerce-cart-form__cart-item').length,
      textLen: (document.body.innerText || '').trim().length,
      stuckInvisible: [...document.querySelectorAll('.elementor-invisible')].filter((e) => e.getClientRects().length).map((e) => e.getAttribute('data-id')),
      swipers: (window.__qaSwipers || []).filter((x) => !x.destroyed).length,
      swiperDupes: (() => { const m = new Map(); (window.__qaSwipers || []).filter((x) => !x.destroyed).forEach((x) => m.set(x.el, (m.get(x.el) || 0) + 1)); return [...m.values()].filter((n) => n > 1).length })(),
    }))
    rec.sections = await sections(page)
    const file = path.join(OUT, side, `${name}-${vp}.png`)
    await shoot(page, file)
    rec.file = file
  }
  const simple = list.filter((p) => !['cart-filled', 'checkout-filled'].includes(p))
  const ctx = await mkctx()
  for (const name of simple) {
    const rec = { consoleErrors: [], failed: [] }
    const page = await ctx.newPage(); watch(page, rec)
    try {
      await go(page, origin + PAGES[name])
      await finish(page, name, rec)
      console.log(side, vp, name, 'ok')
    } catch (e) { rec.error = e.message.split('\n')[0].slice(0, 200); console.log(side, vp, name, 'FAIL', rec.error) }
    results[name] = rec
    await page.close()
    if (side === 'live') await sleep(1500)
  }
  await ctx.close()

  const flows = list.filter((p) => ['cart-filled', 'checkout-filled'].includes(p))
  if (flows.length) {
    const fctx = await mkctx()
    const page = await fctx.newPage()
    const rec0 = { consoleErrors: [], failed: [] }; watch(page, rec0)
    let added = false
    try {
      if (side === 'live') {
        await go(page, `${LIVE}/?add-to-cart=${LIVE_PRODUCT_ID}`); added = true
      } else {
        // Through the app's own UI: the product page's add-to-cart button.
        await go(page, BASE + PAGES.product)
        try { await page.waitForLoadState('networkidle', { timeout: 10000 }) } catch { /* */ }
        const btn = page.locator('form.cart button[type=submit], button.single_add_to_cart_button, .single_add_to_cart_button').first()
        await btn.waitFor({ state: 'visible', timeout: 15000 })
        await btn.click(); added = true
        await page.waitForTimeout(1500)
      }
    } catch (e) { rec0.addError = 'add to cart: ' + e.message.split('\n')[0].slice(0, 200) }
    for (const name of ['cart-filled', 'checkout-filled']) {
      if (!flows.includes(name)) continue
      const rec = { consoleErrors: rec0.consoleErrors, failed: rec0.failed, addError: rec0.addError, added }
      try {
        const target = PAGES[name]
        let routed = false
        if (side === 'clone') {
          // Prefer in-app navigation (cart may live in memory); fall back to a full load.
          routed = await clickLinkTo(page, target, name === 'checkout-filled' ? 'a.checkout-button' : null)
          if (routed) { await page.waitForTimeout(1500); routed = new URL(page.url()).pathname === target }
        }
        if (!routed) await go(page, origin + target)
        rec.navigation = routed ? 'in-app link' : 'page load'
        await finish(page, name, rec)
        console.log(side, vp, name, 'ok', rec.navigation)
      } catch (e) { rec.error = e.message.split('\n')[0].slice(0, 200); console.log(side, vp, name, 'FAIL', rec.error) }
      results[name] = rec
    }
    await fctx.close()
  }
  return results
}

// ---- diff -----------------------------------------------------------------------------------
const readPng = (f) => PNG.sync.read(fs.readFileSync(f))
function blend(c, a) { return 255 + (c - 255) * (a / 255) }
function yiqDelta(d1, i, d2, j) {
  let r1 = d1[i], g1 = d1[i + 1], b1 = d1[i + 2], a1 = d1[i + 3]
  let r2 = d2[j], g2 = d2[j + 1], b2 = d2[j + 2], a2 = d2[j + 3]
  if (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2) return 0
  if (a1 < 255) { r1 = blend(r1, a1); g1 = blend(g1, a1); b1 = blend(b1, a1) }
  if (a2 < 255) { r2 = blend(r2, a2); g2 = blend(g2, a2); b2 = blend(b2, a2) }
  const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223
  const ii = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.2741761 - (b1 - b2) * 0.32180189
  const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694
  return 0.5053 * y * y + 0.299 * ii * ii + 0.1957 * q * q
}
const MAXD = 35215 * 0.1 * 0.1

// Diff region a (x0,y0 in A) against region b (in B), w x h. Returns count and per-row counts.
// tol: a pixel only counts when no pixel within 1px of it on the other side matches either. Used
// for sections, which sit at fractional y on one side and so differ in text anti-aliasing alone.
function diffRegion(A, ay, B, by, w, h, out, tol) {
  let count = 0
  const rows = new Uint32Array(h)
  for (let y = 0; y < h; y++) {
    const ya = ay + y, yb = by + y
    if (ya < 0 || yb < 0 || ya >= A.height || yb >= B.height) { rows[y] = w; count += w; continue }
    let rc = 0
    for (let x = 0; x < w; x++) {
      const inA = x < A.width, inB = x < B.width
      let bad
      if (!inA || !inB) bad = true
      else bad = yiqDelta(A.data, (ya * A.width + x) * 4, B.data, (yb * B.width + x) * 4) > MAXD
      if (bad && tol && inA && inB) {
        search: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, y2 = yb + dy
          if (xx < 0 || xx >= B.width || y2 < 0 || y2 >= B.height) continue
          if (yiqDelta(A.data, (ya * A.width + x) * 4, B.data, (y2 * B.width + xx) * 4) <= MAXD) { bad = false; break search }
        }
      }
      if (bad) rc++
      if (out) {
        const o = (y * out.width + x) * 4
        if (bad) { out.data[o] = 255; out.data[o + 1] = inA && inB ? 0 : 200; out.data[o + 2] = 0; out.data[o + 3] = 255 } else if (inA) {
          const k = (ya * A.width + x) * 4
          const g = 255 - (255 - (A.data[k] * 0.3 + A.data[k + 1] * 0.59 + A.data[k + 2] * 0.11)) * 0.15
          out.data[o] = out.data[o + 1] = out.data[o + 2] = g; out.data[o + 3] = 255
        }
      }
    }
    rows[y] = rc; count += rc
  }
  return { count, rows }
}

function bands(rows, width, dpr) {
  const min = Math.max(3, Math.round(width * 0.002))
  const gap = 16 * dpr
  const res = []
  let cur = null
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] >= min) {
      if (cur && y - cur.y1 <= gap) { cur.y1 = y; cur.px += rows[y] } else { cur = { y0: y, y1: y, px: rows[y] }; res.push(cur) }
    }
  }
  return res.filter((b) => b.px >= 50)
}

function crop(img, y0, h) {
  const out = new PNG({ width: img.width, height: h })
  out.data.fill(255)
  for (let y = 0; y < h; y++) {
    const sy = y0 + y
    if (sy < 0 || sy >= img.height) continue
    img.data.copy(out.data, y * img.width * 4, sy * img.width * 4, (sy + 1) * img.width * 4)
  }
  return out
}
function sideBySide(imgs, file) {
  const gap = 12
  const w = imgs.reduce((s, i) => s + i.width, 0) + gap * (imgs.length - 1)
  const h = Math.max(...imgs.map((i) => i.height))
  const out = new PNG({ width: w, height: h })
  for (let k = 0; k < out.data.length; k += 4) { out.data[k] = 40; out.data[k + 1] = 40; out.data[k + 2] = 40; out.data[k + 3] = 255 }
  let x0 = 0
  for (const img of imgs) {
    for (let y = 0; y < img.height; y++) img.data.copy(out.data, (y * w + x0) * 4, y * img.width * 4, (y + 1) * img.width * 4)
    x0 += img.width + gap
  }
  fs.writeFileSync(file, PNG.sync.write(out))
}

function comparePage(name, vp, liveRec, cloneRec, refFile) {
  const dpr = VIEWPORTS[vp].deviceScaleFactor
  const tag = `${name}-${vp}`
  const r = { page: name, vp, tag }
  if (!cloneRec || cloneRec.error || !cloneRec.file) { r.status = 'error'; r.note = cloneRec ? cloneRec.error : 'not captured'; return r }
  const expected = expectedBodyClass(name)
  const have = new Set((cloneRec.dom.bodyClass || '').split(/\s+/))
  r.bodyClassMatch = expected.length ? +(expected.filter((c) => have.has(c)).length / expected.length).toFixed(2) : null
  r.bodyClassMissing = expected.filter((c) => !have.has(c)).slice(0, 12)
  // The identifying class (page-id-9 for the cart, postid-934 for the product...) says whether the
  // route rendered this page or fell through to another one; no .elementor at all means nothing
  // from the live markup is on the page yet.
  const idClass = expected.find((c) => /^(page-id-\d+|postid-\d+|woocommerce-shop|woocommerce-cart|woocommerce-checkout|woocommerce-account)$/.test(c))
  r.status = !cloneRec.dom.hasElementor ? 'missing' : (idClass && !have.has(idClass)) ? 'wrong page' : 'present'
  if (idClass && !have.has(idClass)) r.note = (r.note ? r.note + '; ' : '') + `body lacks ${idClass} (clone shows: ${(cloneRec.dom.title || '').slice(0, 40)})`
  if (name === 'cart-filled' || name === 'checkout-filled') {
    r.cartItems = cloneRec.dom.cartItems
    if (cloneRec.addError) r.note = (r.note ? r.note + '; ' : '') + cloneRec.addError
  }
  const baseFile = BASELINE === 'reference' ? refFile : (liveRec && liveRec.file) || refFile
  r.baseline = baseFile === refFile ? 'qa/reference' : 'live (masked)'
  if (!baseFile || !fs.existsSync(baseFile)) { r.status = 'no-baseline'; return r }
  const A = readPng(baseFile), B = readPng(cloneRec.file)
  const W = Math.max(A.width, B.width), H = Math.max(A.height, B.height)
  r.size = { live: [A.width / dpr, A.height / dpr], clone: [B.width / dpr, B.height / dpr] }
  r.heightDiff = (B.height - A.height) / dpr
  const out = new PNG({ width: W, height: H }); out.data.fill(255)
  const { count, rows } = diffRegion(A, 0, B, 0, W, H, out)
  fs.writeFileSync(path.join(OUT, 'diff', tag + '.png'), PNG.sync.write(out))
  r.diffPct = +(100 * count / (W * H)).toFixed(2)
  let first = -1; for (let y = 0; y < rows.length; y++) if (rows[y] >= Math.max(3, W * 0.002)) { first = y; break }
  r.firstDiffY = first < 0 ? null : Math.round(first / dpr)
  const bs = bands(rows, W, dpr)
  r.bands = bs.map((b) => ({ y0: Math.round(b.y0 / dpr), y1: Math.round(b.y1 / dpr), px: b.px, pctOfBand: +(100 * b.px / (W * (b.y1 - b.y0 + 1))).toFixed(1) }))
  if (refFile && fs.existsSync(refFile) && baseFile !== refFile) {
    const R = readPng(refFile)
    const rr = diffRegion(R, 0, B, 0, Math.max(R.width, B.width), Math.max(R.height, B.height), null)
    r.diffPctVsReference = +(100 * rr.count / (Math.max(R.width, B.width) * Math.max(R.height, B.height))).toFixed(2)
  }

  // Section-by-section: same element (by data-id) on both sides, each at its own y.
  const ls = (liveRec && liveRec.sections && baseFile !== refFile) ? liveRec.sections : null
  if (ls) {
    const cmap = new Map(cloneRec.sections.map((s) => [s.key, s]))
    const lkeys = new Set(ls.map((s) => s.key))
    r.sections = ls.map((s) => {
      const c = cmap.get(s.key)
      if (!c) return { key: s.key, liveY: s.y, liveH: s.h, missing: true }
      const h = Math.max(0, Math.min(s.h, c.h, A.height / dpr - s.y, B.height / dpr - c.y)) * dpr
      const d = h > 0 ? diffRegion(A, s.y * dpr, B, c.y * dpr, W, h, null, true) : { count: 0 }
      const pct = h > 0 ? +(100 * d.count / (W * h)).toFixed(2) : 0
      return { key: s.key, liveY: s.y, liveH: s.h, cloneY: c.y, cloneH: c.h, dH: c.h - s.h, dY: c.y - s.y, diffPct: pct }
    })
    const miss = r.sections.filter((x) => x.missing)
    r.missingSections = miss.length
    if (r.status === 'present' && miss.length && miss.reduce((t, x) => t + x.liveH, 0) > 0.3 * (A.height / dpr)) {
      r.status = 'incomplete'
      r.note = (r.note ? r.note + '; ' : '') + `${miss.length} live sections absent (${miss.slice(0, 4).map((x) => x.key).join(', ')})`
    }
    r.extraSections = cloneRec.sections.filter((s) => !lkeys.has(s.key)).map((s) => s.key + ' @' + s.y + ' h' + s.h).slice(0, 10)
  }

  // Crops of the worst bands: live | clone | diff, same y on both sides.
  const worst = [...bs].sort((a, b) => b.px - a.px).slice(0, NCROPS)
  r.crops = []
  worst.forEach((b, i) => {
    const pad = 24 * dpr
    const y0 = Math.max(0, b.y0 - pad)
    const h = Math.min(b.y1 + pad - y0, 700 * dpr)
    const file = path.join(OUT, 'crops', `${tag}-band${i + 1}.png`)
    sideBySide([crop(A, y0, h), crop(B, y0, h), crop(out, y0, h)], file)
    r.crops.push({ file: path.relative(ROOT, file).replace(/\\/g, '/'), y0: Math.round(y0 / dpr), y1: Math.round((y0 + h) / dpr) })
  })
  // Worst section, aligned (each side at its own y): shows the real difference once shifts are removed.
  if (r.sections) {
    const ws = r.sections.filter((s) => !s.missing && s.diffPct > 1).sort((a, b) => b.diffPct * b.liveH - a.diffPct * a.liveH).slice(0, NCROPS)
    r.sectionCrops = []
    ws.forEach((s, i) => {
      const h = Math.min(Math.max(s.liveH, s.cloneH), 900) * dpr
      const file = path.join(OUT, 'crops', `${tag}-section${i + 1}.png`)
      const la = crop(A, s.liveY * dpr, h), cb = crop(B, s.cloneY * dpr, h)
      const d = new PNG({ width: W, height: h }); d.data.fill(255); diffRegion(la, 0, cb, 0, W, h, d, true)
      sideBySide([la, cb, d], file)
      r.sectionCrops.push({ key: s.key, file: path.relative(ROOT, file).replace(/\\/g, '/') })
    })
  }
  return r
}

// ---- report ---------------------------------------------------------------------------------
function report(all, live, clone) {
  const L = []
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16)
  L.push('# Visual QA - illumea React clone vs live', '', `Run: ${now} UTC. Clone: ${BASE}. Baseline: ${BASELINE === 'reference' ? 'qa/reference (unmasked)' : 'live site re-captured with the same masks (qa/out/live), falling back to qa/reference'}.`, '')
  L.push('Regenerate: `node qa/compare.cjs` (add `--refresh-live` to re-capture illumea.lk, `--pages=home,shop`, `--vp=d`, `--report-only` to rebuild this file from results.json).', '')
  // Curated, human-written findings (qa/findings.md) survive every regeneration of this file.
  const findings = path.join(__dirname, 'findings.md')
  if (fs.existsSync(findings)) L.push(fs.readFileSync(findings, 'utf8').trim(), '')
  L.push('## Pages, worst first', '', '| page | vp | status | diff % | vs qa/reference % | height live / clone (dH) | first diff y | bands | body class match |', '|---|---|---|---|---|---|---|---|---|')
  const sorted = [...all].sort((a, b) => {
    const s = (r) => r.status !== 'present' ? 1000 + (r.diffPct || 0) : (r.diffPct ?? 999)
    return s(b) - s(a)
  })
  for (const r of sorted) {
    L.push(`| ${r.page} | ${r.vp} | ${r.status}${r.note ? ' (' + r.note.replace(/\|/g, '/') + ')' : ''} | ${r.diffPct ?? '-'} | ${r.diffPctVsReference ?? '-'} | ${r.size ? `${r.size.live[1]} / ${r.size.clone[1]} (${r.heightDiff > 0 ? '+' : ''}${r.heightDiff})` : '-'} | ${r.firstDiffY ?? '-'} | ${r.bands ? r.bands.length : '-'} | ${r.bodyClassMatch ?? '-'} |`)
  }
  L.push('', 'diff % = share of pixels that differ over the larger of the two canvases (extra height counts as different). "first diff y" is the CSS-pixel row where the pages first disagree: everything above it is identical.', '')
  L.push('## Detail per page', '')
  for (const r of sorted) {
    L.push(`### ${r.tag} - ${r.status}${r.diffPct != null ? ', ' + r.diffPct + '% differ' : ''}`, '', `Measured ${(r.when || '').replace('T', ' ').slice(0, 16)} UTC.`, '')
    if (r.note) L.push(`Note: ${r.note}`, '')
    if (r.cartItems != null) L.push(`Cart rows in clone: ${r.cartItems}`, '')
    for (const [side, rec] of [['live', live[r.vp] && live[r.vp][r.page]], ['clone', clone[r.vp] && clone[r.vp][r.page]]]) {
      const st = rec && rec.dom && rec.dom.stuckInvisible
      if (st && st.length) L.push(`Entrance animation never fired on ${side} (still .elementor-invisible): ${st.slice(0, 10).map((x) => '`' + x + '`').join(', ')}`, '')
    }
    const lv = live[r.vp] && live[r.vp][r.page]
    const cv = clone[r.vp] && clone[r.vp][r.page]
    if (cv && cv.dom && (cv.dom.swiperDupes > 0 || (lv && lv.dom && lv.dom.swipers != null && cv.dom.swipers !== lv.dom.swipers))) L.push(`**Swiper instances: live ${(lv && lv.dom && lv.dom.swipers) ?? '?'}, clone ${cv.dom.swipers}; ${cv.dom.swiperDupes} carousel(s) initialised more than once on the clone** (double Elementor init: two autoplays drive one carousel).`, '')
    if (r.bodyClassMissing && r.bodyClassMissing.length) L.push(`Body classes missing on clone: \`${r.bodyClassMissing.join(' ')}\``, '')
    const c = clone[r.vp] && clone[r.vp][r.page]
    if (c && c.failed && c.failed.length) L.push(`Clone failed requests: ${[...new Set(c.failed)].slice(0, 12).map((x) => '`' + x + '`').join(', ')}`, '')
    const liveErr = new Set(((live[r.vp] && live[r.vp][r.page]) || {}).consoleErrors || [])
    const ownErr = c && c.consoleErrors ? [...new Set(c.consoleErrors)].filter((x) => !liveErr.has(x)) : []
    if (ownErr.length) L.push(`Clone console errors (not on live): ${ownErr.slice(0, 5).map((x) => '`' + x.replace(/`/g, "'") + '`').join(', ')}`, '')
    if (r.sections) {
      const bad = r.sections.filter((s) => s.missing || Math.abs(s.dH) > 1 || s.diffPct > 0.5)
      if (bad.length) {
        L.push('| section | live y / h | clone y / h | dH | diff % (aligned, 1px AA tolerance) |', '|---|---|---|---|---|')
        for (const s of bad.slice(0, 25)) L.push(s.missing ? `| ${s.key} | ${s.liveY} / ${s.liveH} | MISSING | | |` : `| ${s.key} | ${s.liveY} / ${s.liveH} | ${s.cloneY} / ${s.cloneH} | ${s.dH} | ${s.diffPct} |`)
        L.push('')
      } else L.push('All sections match in position, height and pixels.', '')
      if (r.extraSections && r.extraSections.length) L.push(`Sections only on the clone: ${r.extraSections.map((x) => '`' + x + '`').join(', ')}`, '')
    }
    if (r.bands && r.bands.length) {
      L.push(`Differing bands (CSS px, top 12 by size): ${[...r.bands].sort((a, b) => b.px - a.px).slice(0, 12).map((b) => `${b.y0}-${b.y1} (${b.pctOfBand}%)`).join(', ')}`, '')
    }
    for (const k of r.sectionCrops || []) L.push(`Aligned section crop (live | clone | diff): [${k.key}](${path.relative(__dirname, path.join(ROOT, k.file)).replace(/\\/g, '/')})`)
    for (const k of r.crops || []) L.push(`Band crop y ${k.y0}-${k.y1} (live | clone | diff): [${path.basename(k.file)}](${path.relative(__dirname, path.join(ROOT, k.file)).replace(/\\/g, '/')})`)
    if (r.diffPct != null) L.push(`Full diff: [diff/${r.tag}.png](out/diff/${r.tag}.png)`.replace('(out/', '('))
    L.push('')
  }
  L.push('## Masks (applied identically to live and clone)', '',
    '- Hidden (visibility:hidden, layout untouched): CookieAdmin consent banner and modal (`[class*=cookieadmin]`), GTranslate floating switcher (`.gtranslate_wrapper`, `.gt_float_switcher`, `#gt-wrapper-*`, Google translate banner), Swiper a11y live region.',
    `- Painted ${MASK_COLOR} (layout kept): ${MASKS.map((m) => '`' + m + '`').join(', ')}.`,
    '- Lazy images: every `img[loading=lazy]` is switched to eager after the freeze, then every image and CSS background is awaited.',
    '- Frozen: every Swiper/Elementor carousel has autoplay stopped and is moved to its first real slide with speed 0; CSS animations and transitions are finished (Playwright `animations: "disabled"`); text caret hidden.',
    '- Same capture sequence both sides: DOM ready + load (max 45 s), networkidle (max 15 s), 1 s, scroll the whole page in 250px steps every 200 ms (slower scrolling left Elementor entrance animations unfired at random), bottom 0.8 s, back to top, 3 s, wait for every img and CSS background to decode (max 15 s), freeze sliders, 0.6 s, full-page screenshot.',
    '- Live cart-filled/checkout-filled: `/?add-to-cart=934` then `/cart/`, `/checkout/`. Clone: click the add-to-cart button on the product page, then the in-app link to /cart/ (and a.checkout-button), falling back to a page load.',
    '- qa/reference (the original unmasked baseline) still contains the cookie banner and whatever slide was showing; the "vs qa/reference" column is informational only.', '')
  return L.join('\n')
}

;(async () => {
  if (arg('report-only')) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'))
    const live = {}
    for (const v of ['d', 'm']) { const f = path.join(OUT, 'live', `meta-${v}.json`); live[v] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {} }
    fs.writeFileSync(path.join(OUT, 'report.md'), report(prev.results, live, prev.clone))
    console.log('report: qa/out/report.md (from results.json)')
    return
  }
  await ensureServer()
  const browser = await chromium.launch()
  const live = {}, clone = {}
  try {
    for (const vp of vpList) {
      const cacheFile = path.join(OUT, 'live', `meta-${vp}.json`)
      let cached = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}
      if (BASELINE !== 'reference') {
        const need = pageList.filter((p) => (REFRESH === true || (typeof REFRESH === 'string' && REFRESH.split(',').includes(p))) || !cached[p] || !cached[p].file || !fs.existsSync(cached[p].file))
        if (need.length) {
          const got = await captureSide(browser, 'live', vp, need)
          cached = { ...cached, ...got }
          fs.writeFileSync(cacheFile, JSON.stringify(cached, null, 1))
        }
      }
      live[vp] = cached
      await ensureServer()
      clone[vp] = await captureSide(browser, 'clone', vp, pageList)
    }
  } finally { await browser.close(); startedServers.forEach(stopServer) }

  const all = []
  for (const vp of vpList) for (const p of pageList) {
    try { all.push(comparePage(p, vp, live[vp][p], clone[vp][p], path.join(REF, `${p}-${vp}.png`))) } catch (e) { all.push({ page: p, vp, tag: `${p}-${vp}`, status: 'error', note: e.message.slice(0, 150) }) }
  }
  // A partial run (--pages / --vp) keeps the previous results for everything it did not redo, so
  // report.md always covers every page; each row says when it was measured.
  const stamp = new Date().toISOString()
  all.forEach((r) => { r.when = stamp })
  const prevFile = path.join(OUT, 'results.json')
  if (fs.existsSync(prevFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(prevFile, 'utf8'))
      const done = new Set(all.map((r) => r.tag))
      for (const r of prev.results || []) if (!done.has(r.tag)) all.push(r)
      for (const v of Object.keys(prev.clone || {})) {
        clone[v] = { ...(prev.clone[v] || {}), ...(clone[v] || {}) }
        if (!live[v]) { const f = path.join(OUT, 'live', `meta-${v}.json`); live[v] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {} }
      }
    } catch { /* unreadable previous run: report this one alone */ }
  }
  fs.writeFileSync(prevFile, JSON.stringify({ when: stamp, base: BASE, baseline: BASELINE, results: all, clone }, null, 1))
  fs.writeFileSync(path.join(OUT, 'report.md'), report(all, live, clone))
  console.log('\npage           vp  status    diff%   dH   firstY')
  for (const r of all.filter((x) => x.when === stamp)) console.log(`${r.page.padEnd(15)}${r.vp}   ${String(r.status).padEnd(9)} ${String(r.diffPct ?? '-').padStart(6)} ${String(r.heightDiff ?? '-').padStart(5)} ${String(r.firstDiffY ?? '-').padStart(6)}`)
  console.log('report: qa/out/report.md')
})().catch((e) => { console.error(e); process.exit(1) })
