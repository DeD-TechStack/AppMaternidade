// diagnostico temporario do CI-UBUNTU (sera removido)
import { spawn } from 'node:child_process'
import { openSync, closeSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

writeFileSync('/tmp/min.html', '<!doctype html><pre id=g>ok</pre><script>(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,100));document.getElementById("g").textContent="pronto"})()</script>')
const BASE = ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=616,900', '--virtual-time-budget=3000', '--dump-dom']
const variantes = [
  { nome: 'teste-atual', stdin: 'ignore', detached: true, extra: ['--disable-crashpad-for-testing', '--disable-dev-shm-usage', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-software-rasterizer', '--mute-audio', '--no-default-browser-check'] },
  { nome: 'sem-crashpad-flag', stdin: 'ignore', detached: true, extra: ['--disable-dev-shm-usage', '--disable-software-rasterizer'] },
  { nome: 'stdin-pipe', stdin: 'pipe', detached: true, extra: ['--disable-crashpad-for-testing', '--disable-dev-shm-usage', '--disable-software-rasterizer'] },
  { nome: 'sem-detached', stdin: 'ignore', detached: false, extra: ['--disable-crashpad-for-testing', '--disable-dev-shm-usage', '--disable-software-rasterizer'] },
  { nome: 'so-base', stdin: 'ignore', detached: true, extra: [] },
  { nome: 'disable-features', stdin: 'ignore', detached: true, extra: ['--disable-crashpad-for-testing', '--disable-dev-shm-usage', '--disable-software-rasterizer', '--disable-features=FdOwnershipChecks'] },
]
let i = 0
for (const v of variantes) {
  i++
  const pasta = `/tmp/dv${i}`
  mkdirSync(pasta, { recursive: true })
  const fo = openSync(`${pasta}/o.txt`, 'w')
  const fe = openSync(`${pasta}/e.txt`, 'w')
  const t0 = Date.now()
  const filho = spawn('/usr/bin/google-chrome', [...BASE, ...v.extra, `--user-data-dir=${pasta}/p`, 'file:///tmp/min.html'], { stdio: [v.stdin, fo, fe], detached: v.detached })
  const fim = await new Promise((resolver) => {
    const rel = setTimeout(() => resolver('tempo'), 20000)
    filho.once('exit', (c, s) => { clearTimeout(rel); resolver(`exit=${c} sig=${s}`) })
  })
  try { process.kill(-filho.pid, 'SIGKILL') } catch {}
  closeSync(fo); closeSync(fe)
  const out = readFileSync(`${pasta}/o.txt`, 'utf8')
  const err = readFileSync(`${pasta}/e.txt`, 'utf8')
  console.log(`VAR ${v.nome}: ${fim} secs=${(Date.now() - t0) / 1000} pronto=${out.includes('>pronto<')} fdviolation=${err.includes('FD ownership')}`)
  await new Promise((r) => setTimeout(r, 1500))
}
