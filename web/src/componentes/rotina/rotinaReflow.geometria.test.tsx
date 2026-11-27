import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

const TZ_ORIGINAL = process.env.TZ

// Same real-CSS / Chrome approach as resumoDoDia.geometria.test.tsx. Range rectangles,
// not element widths or class names, detect the inherited 200%-text collisions.
const DIST = resolve(import.meta.dirname, '../../../dist')
const CHROME = process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : (process.env.CHROME_PATH ?? ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync))

interface Rect { x: number; y: number; right: number; bottom: number; width: number; height: number }
interface TextBox { text: string; rects: Rect[]; font: number; whiteSpace: string; wordBreak: string; overflow: string }
interface Measurement {
  width: number
  rootFont: number
  fonts: string
  loadedFaces: number
  clientWidth: number
  scrollWidth: number
  rows: { box: Rect; value: TextBox; label: TextBox }[]
  buttons: { box: Rect; label: TextBox }[]
}

const SCRIPT = `
(async () => {
  document.body.offsetWidth;
  await document.fonts.ready;
  const rect = r => ({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
  const text = el => {
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3);
    const rects = nodes.flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].map(rect); });
    const s = getComputedStyle(el);
    return {text:nodes.map(n => n.textContent).join('').trim(),rects,font:parseFloat(s.fontSize),whiteSpace:s.whiteSpace,wordBreak:s.wordBreak,overflow:s.textOverflow};
  };
  const result = {
    width:innerWidth,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),
    fonts:document.fonts.status,loadedFaces:[...document.fonts].filter(f=>f.status==='loaded').length,
    clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
    rows:[...document.querySelectorAll('#ultimos .sb-numeros-item')].map(el => ({box:rect(el.getBoundingClientRect()),value:text(el.querySelector('[data-numero]')),label:text(el.querySelector(':scope > p'))})),
    buttons:[...document.querySelectorAll('[data-fileira] > button')].map(el => ({box:rect(el.getBoundingClientRect()),label:text(el.querySelector('span'))}))
  };
  parent.postMessage(JSON.stringify(result),'*');
})().catch(e=>parent.postMessage(JSON.stringify({error:String(e)}),'*'));
`

function measure(html: string, width: number, font: number, theme: string): Measurement {
  expect(CHROME, 'Chrome is required, not skipped').toBeTruthy()
  expect(existsSync(CHROME!)).toBe(true)
  const assets = join(DIST, 'assets')
  expect(existsSync(assets), 'Run npm run build first').toBe(true)
  const css = readdirSync(assets).filter(name => name.endsWith('.css'))
  expect(css.length).toBeGreaterThan(0)
  const dir = mkdtempSync(join(tmpdir(), 'rotina-reflow-'))
  try {
    const sheets = css.map((name, index) => {
      const file = join(dir, `${index}.css`)
      writeFileSync(file, readFileSync(join(assets, name), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_m, quote: string) => `url(${quote}${pathToFileURL(DIST).href}/`))
      return `<link rel="stylesheet" href="${pathToFileURL(file).href}">`
    }).join('')
    const page = join(dir, 'page.html')
    writeFileSync(page, `<!doctype html><html lang="pt-BR" data-tema="${theme}" style="font-size:${font}px"><head><meta charset="utf-8">${sheets}</head><body>${html}<script>${SCRIPT}</script></body></html>`)
    const wrapper = join(dir, 'wrapper.html')
    writeFileSync(wrapper, `<!doctype html><html><body><iframe style="border:0;width:${width}px;height:900px" src="${pathToFileURL(page).href}"></iframe><pre id="measurement" hidden></pre><script>addEventListener('message', e => document.querySelector('#measurement').textContent=e.data)</script></body></html>`)
    const profile = join(dir, 'profile')
    mkdirSync(profile)
    const result = spawnSync(CHROME!, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []), `--user-data-dir=${profile}`, '--virtual-time-budget=3000', '--dump-dom', pathToFileURL(wrapper).href], { encoding: 'utf8', timeout: 45_000, maxBuffer: 16 * 1024 * 1024 })
    expect(result.error, 'Chrome launch').toBeUndefined()
    expect(result.signal, 'Chrome signal').toBeNull()
    expect(result.status, result.stderr).toBe(0)
    const match = /<pre id="measurement"[^>]*>([\s\S]*?)<\/pre>/.exec(result.stdout)
    expect(match?.[1], 'Fresh browser measurement is required').toBeTruthy()
    return JSON.parse(match![1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) as Measurement
  } finally {
    try { rmSync(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 }) }
    catch (error) { console.warn('Could not clean the owned Chrome test directory', dir, error) }
  }
}

function inside(text: TextBox, box: Rect) {
  expect.soft(text.rects.length, text.text).toBeGreaterThan(0)
  expect.soft(text.overflow, text.text).not.toBe('ellipsis')
  expect.soft(text.wordBreak, text.text).not.toBe('break-all')
  for (const rect of text.rects) {
    expect.soft(rect.x, JSON.stringify({ text: text.text, rect, box })).toBeGreaterThanOrEqual(box.x - 1)
    expect.soft(rect.right, JSON.stringify({ text: text.text, rect, box })).toBeLessThanOrEqual(box.right + 1)
    expect.soft(rect.y, text.text).toBeGreaterThanOrEqual(box.y - 1)
    expect.soft(rect.bottom, text.text).toBeLessThanOrEqual(box.bottom + 1)
  }
}

function separate(a: TextBox, b: TextBox) {
  for (const x of a.rects) for (const y of b.rects) {
    const overlap = Math.min(x.right, y.right) - Math.max(x.x, y.x) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.y, y.y) > 1
    expect.soft(overlap, JSON.stringify({ a: a.text, b: b.text, x, y })).toBe(false)
  }
}

afterEach(() => vi.useRealTimers())

describe('Últimos and quick actions retain readable text in Chrome', () => {
  // The app prints hours in the device time zone: pin it, so '16/11 14:50' (São Paulo) does not depend on the host.
  beforeAll(() => {
    process.env.TZ = 'America/Sao_Paulo'
  })
  afterAll(() => {
    if (TZ_ORIGINAL === undefined) delete process.env.TZ
    else process.env.TZ = TZ_ORIGINAL
  })
  for (const theme of ['claro', 'madrugada']) for (const [width, font] of [[390, 16], [390, 32], [1440, 16]]) {
    it(`${width}px / root ${font}px / ${theme}: full labels and values fit without intersections`, async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-20T13:00:00Z'))
      const { container } = await renderizarRotaPronta('/app/hoje', {
        sessao: 'juliana', diaCompleto: true, fusoDaFamilia: 'America/Sao_Paulo',
        ajustarRotina: fixture => ({ ...fixture, registros: [...fixture.registros, {
          ...fixture.registros[0], id: 'a0000000-0000-7000-8000-000000000999', tipo: 'observacao',
          inicio: '2026-11-16T17:50:00Z', fim: null, fuso: 'America/Sao_Paulo', detalhes: {}, nota: 'Local reflow fixture',
        }, {
          ...fixture.registros[0], id: 'a0000000-0000-7000-8000-000000000998', tipo: 'solido',
          inicio: '2026-11-19T15:00:00Z', fim: null, fuso: 'America/Sao_Paulo', detalhes: {}, nota: null,
        }] }),
      })
      const m = measure(container.innerHTML, width, font, theme)
      expect(m.width).toBe(width)
      expect(m.rootFont).toBe(font)
      expect(m.fonts).toBe('loaded')
      expect(m.loadedFaces).toBeGreaterThan(0)
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
      expect(m.rows).toHaveLength(7)
      const witness = m.rows.find(row => row.label.text === 'Observação')!
      expect(witness.value.text).toBe('16/11 14:50')
      expect(witness.label.rects).toHaveLength(1)
      expect(witness.value.rects).toHaveLength(1)
      for (const row of m.rows) {
        inside(row.label, row.box)
        inside(row.value, row.box)
        separate(row.label, row.value)
        if (width === 390) expect.soft(row.label.rects[0].x).toBeCloseTo(row.box.x, 0)
        expect.soft(row.label.font).toBeGreaterThanOrEqual(font * 0.875)
        expect.soft(row.value.font).toBeGreaterThanOrEqual(font)
      }
      expect(m.buttons.map(button => button.label.text)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
      for (const [index, button] of m.buttons.entries()) {
        inside(button.label, button.box)
        expect.soft(button.label.rects).toHaveLength(1)
        expect.soft(button.label.font).toBeGreaterThanOrEqual(font * 0.875)
        expect.soft(button.box.height).toBeGreaterThanOrEqual(3.5 * font)
        expect.soft(button.box.width).toBeGreaterThanOrEqual(44)
        for (const next of m.buttons.slice(index + 1)) separate(button.label, next.label)
      }
      if (font === 16) expect(new Set(m.buttons.map(button => button.box.y)).size).toBe(1)
      else expect(new Set(m.buttons.map(button => button.box.y)).size).toBeGreaterThan(1)
    }, 60_000)
  }
})

// F1 (review round 1): the fixed quick-action bar is ONE row of four or TWO rows of two, never 3+1, and it
// does not double its height while every label still fits on one row. The sweep covers the whole
// width x root-size grid; the full grid runs in both themes.
const SWEEP_WIDTHS = [320, 360, 390, 430]
const SWEEP_FONTS = [16, 18, 20, 24, 32]
// Measured: "Mamada", the widest label, is 3.772rem wide (90.5px at root 24px). Four columns hold it only when the
// bar is at least 4 x 3.772 + 3 x 0.5 (gap) = 16.6rem wide; the bar is the viewport minus two gutters (~20px each).
// Cases where all four labels fit on one row: the bar must stay on ONE row.
const ONE_ROW = new Set(['320/16', '360/16', '390/16', '390/18', '390/20', '430/16', '430/18', '430/20'])
// Cases where they cannot (390/32 is the minimum; 430/24 is a 16.2rem bar, below the 16.6rem the four labels need).
const TWO_ROWS = new Set(['390/32', '320/32', '360/32', '430/24'])

describe('quick-action bar: one row of four or two rows of two, at every width and root size', () => {
  let html: string | undefined
  async function barHtml() {
    if (html) return html
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T13:00:00Z'))
    const { container } = await renderizarRotaPronta('/app/hoje', { sessao: 'juliana', diaCompleto: true, fusoDaFamilia: 'America/Sao_Paulo' })
    html = container.innerHTML
    return html
  }

  for (const theme of ['claro', 'madrugada']) for (const width of SWEEP_WIDTHS) for (const font of SWEEP_FONTS) {
    const key = `${width}/${font}`
    it(`${width}px / root ${font}px / ${theme}: 1x4 or 2x2, labels contained, no horizontal scroll`, async () => {
      const m = measure(await barHtml(), width, font, theme)
      expect(m.width).toBe(width)
      expect(m.rootFont).toBe(font)
      expect(m.fonts).toBe('loaded')
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
      expect(m.buttons.map(button => button.label.text)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])

      const rowsY = new Map<number, number>()
      for (const button of m.buttons) rowsY.set(Math.round(button.box.y), (rowsY.get(Math.round(button.box.y)) ?? 0) + 1)
      const shape = JSON.stringify([...rowsY.entries()])
      expect([1, 2], `distinct row count ${shape}`).toContain(rowsY.size)
      // 1 row = four buttons; 2 rows = two buttons each, never a lone button.
      expect([...rowsY.values()], `buttons per row ${shape}`).toEqual(rowsY.size === 1 ? [4] : [2, 2])
      if (ONE_ROW.has(key)) expect(rowsY.size, `all four labels fit at ${key}: one row, not a doubled bar`).toBe(1)
      if (TWO_ROWS.has(key)) expect(rowsY.size, `labels cannot fit on one row at ${key}`).toBe(2)

      for (const [index, button] of m.buttons.entries()) {
        inside(button.label, button.box)
        expect.soft(button.label.rects, button.label.text).toHaveLength(1)
        expect.soft(button.label.font).toBeGreaterThanOrEqual(font * 0.875)
        expect.soft(button.box.height).toBeGreaterThanOrEqual(3.5 * font)
        expect.soft(button.box.width).toBeGreaterThanOrEqual(44)
        for (const next of m.buttons.slice(index + 1)) separate(button.label, next.label)
      }

      // No needless 2x2: with two rows, a four-column track must NOT have held the widest label with 0.2rem to spare.
      if (rowsY.size === 2) {
        const gap = 0.5 * font
        const row = m.buttons[1].box.right - m.buttons[0].box.x
        const track = (row - 3 * gap) / 4
        const widest = Math.max(...m.buttons.map(button => button.label.rects[0].width))
        expect(track, `2x2 at ${key} although a four-column track (${track.toFixed(1)}px) holds the widest label (${widest.toFixed(1)}px)`).toBeLessThan(widest + 0.2 * font)
      }
    }, 60_000)
  }
})
