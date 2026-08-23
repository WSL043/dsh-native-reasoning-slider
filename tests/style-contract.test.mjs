import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('energy mode uses DSH tokens that exist in the official Web theme', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /--dsw-alias-state-business-primary/)
  assert.doesNotMatch(source, /--dsw-alias-state-brand-primary|--dsw-alias-state-info-primary/)
})

test('the compact control keeps motion optional and the effect transient', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /prefers-reduced-motion:reduce/)
  assert.match(source, /\.nrs-effort\.is-max\.is-active::after/)
  assert.doesNotMatch(source, /animation:[^;}]*infinite/)
})

test('the composer stays one row and the effort popover is compact', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-triggers\{[^}]*display:flex[^}]*height:28px/)
  assert.match(source, /\.nrs-model-trigger,\.nrs-effort-trigger\{[^}]*height:28px/)
  assert.match(source, /\.nrs-effort-popover\.is-down\{[^}]*top:calc\(100% \+ 8px\)/)
  assert.match(source, /\.nrs-effort-popover\.is-up\{[^}]*bottom:calc\(100% \+ 8px\)/)
  assert.match(source, /\.nrs-effort\{[^}]*padding:8px/)
  assert.doesNotMatch(source, /\.nrs-effort-head/)
})

test('the energy capsule follows the native range geometry and settings remain readable', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-track-wrap\{[^}]*height:34px[^}]*border-radius:10px/)
  assert.match(source, /\.nrs-track-fill\{[^}]*width:calc\(17px \+ \(100% - 34px\) \* var\(--nrs-ratio\)\)/)
  assert.match(source, /\.nrs-range\{[^}]*inset:0 6px[^}]*width:calc\(100% - 12px\)/)
  assert.doesNotMatch(source, /\.nrs-track-fill\{[^}]*transition:width/)
  assert.match(source, /\.nrs-track-thumb\{[^}]*left:calc\(17px \+ \(100% - 34px\) \* var\(--nrs-ratio\)\)[^}]*width:26px[^}]*height:26px/)
  assert.match(source, /\.nrs-track-flare\{[^}]*left:calc\(17px \+ \(100% - 34px\) \* var\(--nrs-ratio\)\)[^}]*transform:translate\(-100%,-50%\)/)
  assert.doesNotMatch(source, /\.nrs-track-flare::before/)
  assert.match(source, /\.nrs-effort\.is-energy\.is-max\.is-active \.nrs-track-thumb\{[^}]*animation:nrs-max-charge 720ms/)
  assert.match(source, /nrs-max-breathe 520ms[^,;}]*720ms 2/)
  assert.match(source, /\.nrs-effort-popover\.is-down\{[^}]*top:calc\(100% \+ 8px\)/)
  assert.match(source, /\.nrs-effort-popover\.is-up\{[^}]*bottom:calc\(100% \+ 8px\)/)
  assert.match(source, /\.nrs-mode-row\{[^}]*border-bottom:1px solid var\(--dsw-alias-border-l2\)[^}]*padding:18px 0/)
  assert.match(source, /@media\(max-width:640px\)[^{]*\{[^}]*\.nrs-mode-row\{[^}]*flex-direction:column/)
  assert.match(source, /@media\(max-width:480px\)[^{]*\{[^}]*\.nrs-effort-popover\{[^}]*right:-48px[^}]*width:min\(276px,calc\(100vw - 88px\)\)/)
})

test('custom energy colors use a single plugin variable without generic rainbow gradients', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /--nrs-color/)
  assert.match(source, /\.nrs-color-control/)
  assert.doesNotMatch(source, /conic-gradient|hue-rotate/)
})
