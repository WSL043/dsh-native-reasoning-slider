import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceUrl = new URL('../src/energy.jsx', import.meta.url)

test('one production renderer keeps the accepted cellular feedback geometry', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /const ENERGY_SIMULATION/u)
  assert.match(source, /vec2\(72\.0,\s*6\.0\)/u)
  assert.match(source, /progressAge=max\(u_elapsed-randomValue\*1\.2,0\.0\)/u)
  assert.match(source, /feedbackRetention=mix\(0\.18,0\.90,smoothstep\(0\.90,1\.0,u_ratio\)\)/u)
  assert.match(source, /retained=history\*feedbackRetention\*leftFade/u)
  assert.doesNotMatch(source, /REFERENCE_SIMULATION|COMPACT_SIMULATION|CONTINUOUS_SIMULATION/u)
})

test('propagation is constant in CSS pixels and phase speed never changes after startup', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /uniform float u_css_width/u)
  assert.match(source, /travelPixels=progressAge\*210\.0\*cellVelocity/u)
  assert.match(source, /traveled=min\(travelPixels\/max\(u_css_width,1\.0\),u_ratio\+0\.05\)\*started/u)
  assert.match(source, /float timeScale=1\.0/u)
  assert.match(source, /gl\.uniform1f\(sim\.cssWidth, canvas\.clientWidth\)/u)
  assert.doesNotMatch(source, /cubicProgress|spreadDuration/u)
})

test('the single renderer honors the host transition and Max-level gate', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /const effectActive = state\.active/u)
  assert.match(source, /enabled=smoothstep\(0\.001,0\.05,u_intensity\)/u)
  assert.doesNotMatch(source, /styleVariant|referenceEnabled/u)
})

test('settled intermediate levels keep a compact bounded energy current', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  const settled = source.slice(source.indexOf('float settledLitSide'), source.indexOf('float progressAge'))
  assert.match(settled, /settledCore/u)
  assert.match(settled, /settledAura/u)
  assert.match(settled, /settledLitSide/u)
  assert.match(settled, /settledFrameNoise/u)
  assert.match(settled, /settledPulse/u)
  assert.doesNotMatch(settled, /travelingSpark|arrivalFlash/u)
})

test('animation lifecycle resets feedback only when an effect becomes active', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /const ratioChanged = Math\.abs\(state\.ratio - previousRatio\) > 0\.0005/u)
  assert.match(source, /if \(state\.ratio > 0 && ratioChanged\) activatedAt = now/u)
  assert.match(source, /if \(effectActive && !previousActive\) \{ activatedAt = now; clearSimulation\(\) \}/u)
  const ratioBranch = source.slice(source.indexOf('const ratioChanged'), source.indexOf('if (effectActive && !previousActive)'))
  assert.doesNotMatch(ratioBranch, /clearSimulation/u)
})

test('renderer keeps a four-target WebGL2 simulation, blur, and composite pipeline', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /getContext\(['"]webgl2['"]/u)
  assert.match(source, /targets = \[makeTarget\(\), makeTarget\(\), makeTarget\(\), makeTarget\(\)\]/u)
  assert.match(source, /const blur = createProgram\(BLUR\)/u)
  assert.match(source, /const composite = createProgram\(COMPOSITE\)/u)
})

test('resize clears every feedback target before reuse', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /targets\.forEach\(\(\{ framebuffer \}\) => \{ gl\.bindFramebuffer/u)
  assert.match(source, /gl\.clearColor\(0, 0, 0, 0\)/u)
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

test('light composition preserves sharp cells and uses restrained bloom', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /vec3 lightSource=scene\*0\.92\+bloom\*0\.22/u)
  assert.match(source, /lightMapped=pow\(clamp\(lightSource,0\.0,1\.0\),vec3\(0\.92\)\)/u)
  assert.match(source, /lightAlpha=smoothstep\(0\.010,0\.36,lightPeak\)\*0\.82/u)
  assert.match(source, /gl\.uniform1f\(locations\.blurRadius, 1\.8\)/u)
  assert.match(source, /outputColor=u_light>0\.5\?vec4\(lightMapped,lightAlpha\):vec4\(mapped,1\.0\)/u)
})

test('light uses an analogous hue ladder instead of a white dark-theme core', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /vec3 rgbToHsv/u)
  assert.match(source, /sourceHsv\.x\+0\.035/u)
  assert.match(source, /sourceHsv\.x-0\.025/u)
  assert.match(source, /coolColor=mix\(u_color\*0\.35,lightTail,u_light\)/u)
  assert.match(source, /warmWhite=mix\(vec3\(1\.0,0\.94,0\.98\),lightCore,u_light\)/u)
})

test('endpoint cores cannot illuminate the unselected side of the thumb', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /float litSide=step\(coordinate\.x,u_ratio\+0\.003\)/u)
  assert.match(source, /endpointCore=.*\*litSide/u)
  assert.match(source, /3\.5,2\.0\).*\*litSide/u)
})
