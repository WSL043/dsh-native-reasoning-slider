import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

test('interactive demo reuses the production energy renderer and stays provider neutral', async () => {
  const [entry, page] = await Promise.all([
    readFile(new URL('demo/main.jsx', root), 'utf8'),
    readFile(new URL('docs/index.html', root), 'utf8'),
  ])
  assert.match(entry, /EnergyField/u)
  assert.match(entry, /energyIntensity/u)
  assert.match(entry, /Off.*Low.*High.*Max/su)
  assert.match(entry, /prefers-color-scheme/u)
  assert.match(entry, /Light palette/u)
  assert.match(entry, /Dark palette/u)
  assert.match(entry, /PALETTE_PRESETS/u)
  assert.doesNotMatch(entry, /Continuous|Reference|Compact · Beta/u)
  assert.doesNotMatch(entry, /styleVariant/u)
  assert.match(entry, /baseColor=\{baseColor\}/u)
  assert.match(entry, /const energized = ratio > 0 && \(active \|\| preview >= 99\.95\)/u)
  assert.match(entry, /setSettling\(next > 0\)/u)
  assert.match(entry, /active=\{energized\}/u)
  assert.match(entry, /type="color"/u)
  assert.match(entry, /Two color implementations/u)
  assert.match(entry, /light=\{!dark\}/u)
  assert.match(entry, /<ThemePreview[^>]*dark=\{false\}/u)
  assert.match(entry, /<ThemePreview[^>]*dark intensity=/u)
  assert.doesNotMatch(entry, /track-bg/u)
  assert.match(page, /demo\.js/u)
  assert.doesNotMatch(entry, /DeepSeek API key|credential|fetch\(/u)
})

test('GitHub Pages deploys the built demo and public docs link it', async () => {
  const [workflow, readme, readmeZh] = await Promise.all([
    readFile(new URL('.github/workflows/pages.yml', root), 'utf8'),
    readFile(new URL('README.md', root), 'utf8'),
    readFile(new URL('README.zh-CN.md', root), 'utf8'),
  ])
  assert.match(workflow, /deploy-pages/u)
  assert.match(workflow, /build:demo/u)
  assert.match(readme, /wsl043\.github\.io\/dsh-reasoning-slider/u)
  assert.match(readmeZh, /wsl043\.github\.io\/dsh-reasoning-slider/u)
})
