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
  assert.doesNotMatch(source, /\.nrs-effort\.is-max\.is-active::after/)
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

test('energy appears promptly without a long opacity ramp', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-energy\{[^}]*transition:opacity \.08s ease/u)
  assert.doesNotMatch(source, /\.nrs-energy\{[^}]*transition:opacity \.28s ease/u)
})

test('the energy capsule follows the selected sample 7 geometry and settings remain readable', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-track-wrap\{[^}]*--nrs-thumb-center:calc\(14px \+ \(100% - 28px\) \* var\(--nrs-ratio\)\)[^}]*height:28px[^}]*border-radius:9px/)
  assert.match(source, /\.nrs-track-wrap\{[^}]*box-sizing:border-box/)
  assert.match(source, /\.nrs-track-background\{/)
  assert.match(source, /\.nrs-energy-bed\{[^}]*width:var\(--nrs-thumb-center\)/)
  assert.match(source, /\.nrs-effort\.is-energy:not\(\.is-reference\) \.nrs-energy\{[^}]*opacity:var\(--nrs-canvas-opacity\)/)
  assert.match(source, /\.nrs-effort\.is-energy\.is-reference\.is-max \.nrs-energy\{[^}]*opacity:1/)
  assert.match(source, /\.nrs-track-thumb\{[^}]*left:var\(--nrs-thumb-center\)[^}]*width:27px[^}]*height:27px/)
  assert.match(source, /\.nrs-track-thumb\{[^}]*box-sizing:border-box/)
  assert.match(source, /\.nrs-range\{[^}]*inset:0[^}]*width:100%/)
  assert.doesNotMatch(source, /\.nrs-track-fill|\.nrs-track-flare/)
  assert.doesNotMatch(source, /\.nrs-effort\.is-energy(?:\.is-max)? \.nrs-track-thumb/)
  assert.doesNotMatch(source, /\.nrs-effort[^}]*\.nrs-track-thumb\{[^}]*0 0 28px/)
  assert.doesNotMatch(source, /nrs-max-charge|nrs-max-breathe/)
  assert.doesNotMatch(source, /\.nrs-level\.is-current\{[^}]*text-shadow/)
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

test('settings color controls expose a visible keyboard focus state', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-color-control:has\(input:focus-visible\)/)
  assert.match(source, /box-shadow:0 0 0 2px var\(--dsw-alias-border-l3\)/)
})
