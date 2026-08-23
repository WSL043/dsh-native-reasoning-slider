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
  assert.match(client, /onPointerUp=\{commitPreview\}/)
  assert.match(client, /reasoningEffort:\s*effort\.id/)
  assert.doesNotMatch(client, /onInput=\{[^}]*select\(/s)
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
  assert.match(client, /triggerRef\.current\?\.focus\(\)/)
  assert.match(client, /onKeyDown=\{onRootKeyDown\}/)
})
