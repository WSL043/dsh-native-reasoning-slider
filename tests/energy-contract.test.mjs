import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('energy renderer is an independent, bounded WebGL2 effect with cleanup', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /getContext\(['"]webgl2['"]/)
  assert.match(source, /u_intensity/)
  assert.match(source, /u_ratio/)
  assert.match(source, /inactive < 150/)
  assert.match(source, /cancelAnimationFrame/)
  assert.match(source, /deleteProgram/)
  assert.match(source, /ResizeObserver/)
  assert.doesNotMatch(source, /vue-effort-slider|claude-range-slider|setInterval/)
})

test('the effect distinguishes light rendering and never fails without WebGL2', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /uniform bool u_light/)
  assert.match(source, /canvas === null \|\| gl === null \|\| gl === undefined/)
  assert.match(source, /premultipliedAlpha:\s*true/)
})
