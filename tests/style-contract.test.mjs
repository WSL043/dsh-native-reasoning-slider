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
})

test('the composer stays one row and the effort popover is compact', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /\.nrs-triggers\{[^}]*display:flex[^}]*height:28px/)
  assert.match(source, /\.nrs-model-trigger,\.nrs-effort-trigger\{[^}]*height:28px/)
  assert.match(source, /\.nrs-effort-popover\{[^}]*bottom:calc\(100% \+ 8px\)/)
  assert.match(source, /\.nrs-effort\{[^}]*padding:8px/)
  assert.doesNotMatch(source, /\.nrs-effort-head/)
})

test('the fill follows the 20px thumb center and settings remain readable in narrow panels', async () => {
  const source = await readFile(new URL('../src/styles.js', import.meta.url), 'utf8')
  assert.match(source, /width:calc\(10px \+ \(100% - 20px\) \* var\(--nrs-ratio\)\)/)
  assert.match(source, /\.nrs-mode-row\{[^}]*flex-direction:column[^}]*align-items:stretch/)
  assert.match(source, /\.nrs-mode-control\{[^}]*box-sizing:border-box[^}]*width:100%/)
  assert.match(source, /\.nrs-mode-button\{[^}]*flex:1/)
})
