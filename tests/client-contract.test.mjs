import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const clientPath = new URL('../src/client.jsx', import.meta.url)

test('client extends the supported model seat instead of scraping DSH DOM text', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /conversation\.input\.model/)
  assert.match(client, /modelDirectories/)
  assert.match(client, /priority:\s*-100/)
  assert.doesNotMatch(client, /MutationObserver|querySelector|textContent\.startsWith/)
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
  assert.match(client, /onPointerUp=\{event\s*=>\s*\{\s*void commitAt\(Number\(event\.currentTarget\.value\)\)\s*\}\}/)
  assert.doesNotMatch(client, /const commitPreview\s*=/)
  assert.match(client, /reasoningEffort:\s*effort\.id/)
  assert.doesNotMatch(client, /onInput=\{[^}]*select\(/s)
})

test('energy geometry follows the same thumb travel as the native range input', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /const thumbRadius = 10 \* ratio/)
  assert.match(client, /thumbRadius \+ normalized \* \(width - thumbRadius \* 2\)/)
})

test('model and effort use separate compact triggers and popovers', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /className="nrs-model-trigger"/)
  assert.match(client, /className="nrs-effort-trigger"/)
  assert.match(client, /className="nrs-effort-popover"/)
  assert.match(client, /setOpen\([^\n]*['"]effort['"][^\n]*\)/)
  assert.doesNotMatch(client, /<span className="nrs-trigger-effort"/)
})

test('energy rendering has reduced-motion and transient lifecycle gates', async () => {
  const client = await readFile(clientPath, 'utf8')
  assert.match(client, /prefers-reduced-motion:\s*reduce/)
  assert.match(client, /cancelAnimationFrame/)
  assert.match(client, /settling/)
  assert.match(client, /mode\s*===\s*['"]energy['"]/)
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
