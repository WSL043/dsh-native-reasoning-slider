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
