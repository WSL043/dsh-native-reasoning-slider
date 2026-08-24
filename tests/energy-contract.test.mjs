import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('energy renderer is an independent, bounded multi-pass WebGL2 effect with cleanup', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /getContext\(['"]webgl2['"]/)
  assert.match(source, /u_intensity/)
  assert.match(source, /u_ratio/)
  assert.match(source, /u_max_reveal/)
  assert.match(source, /history\*0\.90\*leftFade/)
  assert.match(source, /fract\(u_time/)
  assert.match(source, /sin\([^\n]*u_time/)
  assert.doesNotMatch(source, /max\(previous\.rgb/)
  assert.match(source, /inactive < 150/)
  assert.match(source, /createFramebuffer/)
  assert.match(source, /const referenceSimulation = createProgram\(REFERENCE_SIMULATION\)/)
  assert.match(source, /const compactSimulation = createProgram\(COMPACT_SIMULATION\)/)
  assert.match(source, /const blur = createProgram\(BLUR\)/)
  assert.match(source, /const composite = createProgram\(COMPOSITE\)/)
  assert.match(source, /targets = \[makeTarget\(\), makeTarget\(\), makeTarget\(\), makeTarget\(\)\]/)
  assert.match(source, /cancelAnimationFrame/)
  assert.match(source, /deleteProgram/)
  assert.match(source, /ResizeObserver/)
  assert.doesNotMatch(source, /vue-effort-slider|claude-range-slider|FRAG_SIM|setInterval/)
})

test('reference appearance preserves the observed cellular feedback algorithm while compact remains distinct', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  // These are independently named behavior anchors from the known-good sample:
  // 72 x 6 cells, per-cell delayed cubic spread, three oscillators, traveling
  // sparks, a 7-tap bloom and nonlinear tone mapping.
  assert.match(source, /REFERENCE_SIMULATION/)
  assert.match(source, /COMPACT_SIMULATION/)
  assert.match(source, /vec2\(72\.0,\s*6\.0\)/)
  assert.match(source, /randomValue\s*\*\s*1\.2/)
  assert.match(source, /progressAge\s*\/\s*2\.5/)
  assert.match(source, /coordinate\.x\s*\*\s*30\.0/)
  assert.match(source, /coordinate\.x\s*\*\s*17\.0/)
  assert.match(source, /coordinate\.x\s*\*\s*52\.0/)
  assert.match(source, /travelPhase/)
  assert.match(source, /1\.8\s*\/\s*u_resolution/)
  assert.match(source, /0\.227027/)
  assert.match(source, /1\.0-exp\(/)
  assert.match(source, /styleVariant === 'compact' \? compactSimulation : referenceSimulation/)
  assert.match(source, /const elapsed = state\.active \? \(now - activatedAt\) \/ 1000 : -1/)
  assert.match(source, /state\.styleVariant !== previousVariant/)
})

test('reference endpoint remains cellular and does not add a continuous thumb halo', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /energyColor\s*\*=\s*cellMask\*leftFade/)
  assert.doesNotMatch(source, /endpointCore|movingEdge|endpointPixels|endpointWash/)
  assert.doesNotMatch(source, /u_glow/)
})

test('reference Max keeps a live cellular tail into the left quarter without fixed empty cells', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /float leadingEdge=max\(u_ratio-traveled-\(randomValue-0\.5\)\*0\.05,0\.02\)/)
  assert.match(source, /float leftFade=0\.10\+0\.90\*smoothstep\(0\.0,0\.12,coordinate\.x\)/)
  assert.match(source, /brightness=max\(brightness,0\.04\*started\)\*withinTrail/)
  assert.doesNotMatch(source, /step\([^\n]*randomValue[^\n]*\)\s*\*\s*cellMask/)
})

test('only Max grows a sparse moving far tail from right to left instead of appearing at once', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /float maxTailGate=smoothstep\(0\.995,1\.0,u_ratio\)/)
  assert.match(source, /maxTailFront/)
  assert.match(source, /u_max_reveal/)
  assert.match(source, /float maxTailEnvelope=1\.0-smoothstep\(0\.0,0\.34,coordinate\.x\)/)
  assert.match(source, /float maxTailCells=cellMask\*maxTailEnvelope\*maxTailGate/)
  assert.match(source, /energyColor\+=u_color\*maxTailCells/)
  assert.doesNotMatch(source, /maxTail(?:Cells)?[^;]*warmWhite/)
  assert.doesNotMatch(source, /\.nrs-effort\.is-max[^}]*box-shadow/)
})

test('the effect distinguishes light rendering and never fails without WebGL2', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /uniform bool u_light/)
  assert.match(source, /canvas === null \|\| gl === null \|\| gl === undefined/)
  assert.match(source, /premultipliedAlpha:\s*true/)
  assert.doesNotMatch(source, /reducedMotion/)
})

test('the energy canvas stops cleanly on WebGL context loss and rebuilds after restoration', async () => {
  const source = await readFile(new URL('../src/energy.jsx', import.meta.url), 'utf8')
  assert.match(source, /webglcontextlost/)
  assert.match(source, /event\.preventDefault\(\)/)
  assert.match(source, /webglcontextrestored/)
  assert.match(source, /setGeneration\(value => value \+ 1\)/)
  assert.match(source, /removeEventListener\(['"]webglcontextlost['"]/)
  assert.match(source, /removeEventListener\(['"]webglcontextrestored['"]/)
})
