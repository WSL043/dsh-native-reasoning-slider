import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceUrl = new URL('../src/energy.jsx', import.meta.url)

test('reference renderer independently locks the public package observable timing and geometry', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /REFERENCE_SIMULATION/u)
  assert.match(source, /vec2\(72\.0,\s*6\.0\)/u)
  assert.match(source, /ignitionDelay=mix\(0\.35,1\.2,u_reference\)/u)
  assert.match(source, /spreadDuration=mix\(1\.05,2\.5,u_reference\)/u)
  assert.match(source, /cubicProgress\*u_ratio\*mix\(continuousReach,1\.0,u_reference\)\*cellVelocity\*started/u)
  assert.match(source, /retention=mix\(0\.84,0\.90,u_reference\)/u)
  assert.match(source, /leftFadeEnd=mix\(0\.12,0\.45,u_reference\)/u)
  assert.doesNotMatch(source, /trailReach|maxTail|u_max_reveal/u)
})

test('reference is Max-only while continuous remains available across advertised effort levels', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /styleVariant === ['"]reference['"] \? state\.active && state\.ratio >= 0\.95 : state\.active/u)
  assert.match(source, /styleVariant === ['"]compact['"] \? COMPACT_SIMULATION : styleVariant === ['"]reference['"] \? REFERENCE_SIMULATION : CONTINUOUS_SIMULATION/u)
  assert.match(source, /const CONTINUOUS_SIMULATION/u)
})

test('animation lifecycle resets only when an effect becomes active, never for every pointer frame', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /if \(effectActive && !previousActive\) \{ activatedAt = now; clearSimulation\(\) \}/u)
  assert.doesNotMatch(source, /previousRatio|maxEnteredAt|maxRevealProgress/u)
})

test('reference uses an independently named four-pass WebGL2 pipeline and continuous has no thumb halo', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /getContext\(['"]webgl2['"]/u)
  assert.match(source, /targets = \[makeTarget\(\), makeTarget\(\), makeTarget\(\), makeTarget\(\)\]/u)
  assert.match(source, /const blur = createProgram\(BLUR\)/u)
  assert.match(source, /const composite = createProgram\(COMPOSITE\)/u)
  assert.match(source, /endpointCore/u)
  assert.match(source, /u_reference > 0\.5 \? endpointCore : 0\.0/u)
  assert.doesNotMatch(source, /vue-effort-slider|claude-range-slider|FRAG_SIM/u)
})

test('WebGL resources stop and rebuild safely', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /canvas === null \|\| gl === null \|\| gl === undefined/u)
  assert.match(source, /webglcontextlost/u)
  assert.match(source, /event\.preventDefault\(\)/u)
  assert.match(source, /webglcontextrestored/u)
  assert.match(source, /setGeneration\(value => value \+ 1\)/u)
  assert.match(source, /cancelAnimationFrame/u)
  assert.match(source, /deleteProgram/u)
  assert.match(source, /ResizeObserver/u)
})
