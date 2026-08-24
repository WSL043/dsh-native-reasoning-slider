import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const clientPath = new URL('../src/client.jsx', import.meta.url)

test('client extends the supported model seat instead of scraping DSH DOM text', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /conversation\.input\.model/)
  assert.match(client, /modelDirectories/)
  assert.match(client, /priority:\s*-100/)
  assert.doesNotMatch(client, /querySelector|textContent\.startsWith/)
  assert.doesNotMatch(client, /MutationObserver\([^)]*textContent/)
})

test('official mode removes the shadow seat while native and energy modes keep it', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /modeStore\.getSnapshot\(\)\s*===\s*['"]official['"]/)
  assert.match(client, /disposeModelSeat\?\.\(\)/)
  assert.match(client, /modeStore\.subscribe\(syncModelSeat\)/)
})

test('dragging previews locally and commits through the DSH selection contract', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /onInput=\{previewOnly\}/)
  assert.match(client, /onPointerUp=\{event\s*=>\s*\{\s*void commitAt\(indexToPosition\(event\.currentTarget\.value\)\)\s*\}\}/)
  assert.doesNotMatch(client, /const commitPreview\s*=/)
  assert.match(client, /reasoningEffort:\s*effort\.id/)
  assert.doesNotMatch(client, /onInput=\{[^}]*select\(/s)
  assert.match(client, /const sliderStep = 100 \/ \(efforts\.length - 1\)/)
  assert.match(client, /const previewIndex = preview \/ sliderStep/)
  assert.match(client, /const indexToPosition = index => Number\(index\) \* sliderStep/)
  assert.match(client, /max=\{efforts\.length - 1\} step="1" value=\{previewIndex\}/)
})

test('keyboard input moves between advertised effort levels instead of decimal range steps', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /const onSliderKeyDown = event =>/)
  assert.match(client, /ArrowRight['"], ['"]ArrowUp/)
  assert.match(client, /Math\.min\(efforts\.length - 1, currentEffortIndex \+ 1\)/)
  assert.match(client, /event\.preventDefault\(\)/)
  assert.match(client, /onKeyDown=\{onSliderKeyDown\}/)
  assert.doesNotMatch(client, /onKeyUp=\{event =>/)
})

test('energy geometry is driven by the same normalized ratio as the native range input', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /const ratio = preview \/ 100/)
  assert.match(client, /<EnergyField[^>]*ratio=\{ratio\}/)
})

test('model and effort use separate compact triggers and popovers', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /className="nrs-model-trigger"/)
  assert.match(client, /className="nrs-effort-trigger"/)
  assert.match(client, /className=\{`nrs-effort-popover is-\$\{effortSide\}`\}/)
  assert.match(client, /setOpen\([^\n]*['"]effort['"][^\n]*\)/)
  assert.doesNotMatch(client, /<span className="nrs-trigger-effort"/)
})

test('energy rendering is explicit in Energy mode and uses the sample lifecycle', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /settling/)
  assert.match(client, /mode\s*===\s*['"]energy['"]/)
  assert.match(client, /const energized = ratio > 0/)
  assert.match(client, /<EnergyField active=\{energized\}/)
  assert.doesNotMatch(client, /reducedMotion=/)
  assert.match(client, /className="nrs-track-background"/)
  assert.match(client, /className="nrs-energy-bed"/)
  assert.match(client, /className="nrs-track-dots"/)
  assert.match(client, /className="nrs-track-thumb"/)
  assert.match(client, /effort\.id === efforts\[efforts\.length - 1\]\.id \? 1840 : 620/)
})

test('energy presentation is selected in Settings and never inside the composer', async () => {
  const client = await readFile(new URL('../src/client.jsx', import.meta.url), 'utf8')
  const effortSlider = client.slice(client.indexOf('function EffortSlider'), client.indexOf('function ModelSliderSelect'))
  const pluginSettings = client.slice(client.indexOf('function PluginSettings'), client.indexOf('export function register'))
  assert.match(client, /energyStyleStore/)
  assert.match(pluginSettings, /referenceEffect/)
  assert.match(pluginSettings, /compactEffect/)
  assert.doesNotMatch(effortSlider, /SettingsMenu/)
  assert.match(client, /styleVariant=\{energyStyle\}/)
})

test('appearance preferences are local, theme-aware, and support per-model colors', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /dsh-native-reasoning-slider\.appearance\.v1/)
  assert.match(client, /resolveColors\(appearance, current\.provider, current\.model\)/)
  assert.match(client, /appearanceStore\.setModel/)
  assert.match(client, /appearanceStore\.setGlobal/)
  assert.match(client, /data-ds-dark-theme/)
  assert.doesNotMatch(client, /fetch\(|XMLHttpRequest|authorization|token/i)
})

test('color customization belongs to settings rather than the composer effort popover', async () => {
  const client = await readFile(clientPath, 'utf8')
  const effortSlider = client.slice(client.indexOf('function EffortSlider'), client.indexOf('function ModelSliderSelect'))
  const pluginSettings = client.slice(client.indexOf('function PluginSettings'), client.indexOf('export function apply'))

  assert.doesNotMatch(effortSlider, /ColorInput|setModel|nrs-model-colors/)
  assert.match(pluginSettings, /appearanceStore\.setModel/)
  assert.match(pluginSettings, /selectedPaletteModel/)
  assert.match(pluginSettings, /modelColorChoices/)
})

test('effort popover prefers below and flips above only when viewport space requires it', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /setEffortSide\(below >= panel\.offsetHeight \|\| below >= above \? ['"]down['"] : ['"]up['"]\)/)
  assert.match(client, /className=\{`nrs-effort-popover is-\$\{effortSide\}`\}/)
})

test('mode setting uses the official DSH menu primitive', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /<Menu\s+open=\{open\}/)
  assert.match(client, /className="nrs-mode-picker"/)
  assert.doesNotMatch(client, /role="radiogroup"/)
})

test('the replacement model menu preserves keyboard escape and focus movement', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /event\.key\s*===\s*['"]Escape['"]/)
  assert.match(client, /event\.key\s*===\s*['"]ArrowDown['"]/)
  assert.match(client, /modelTriggerRef/)
  assert.match(client, /effortTriggerRef/)
  assert.match(client, /trigger\.current\?\.focus\(\)/)
  assert.match(client, /onKeyDown=\{onRootKeyDown\}/)
})
