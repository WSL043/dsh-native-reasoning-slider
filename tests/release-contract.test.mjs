import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('both public READMEs show cumulative npm downloads, never a time-window count', async () => {
  const readmes = await Promise.all([
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../README.zh-CN.md', import.meta.url), 'utf8'),
  ])
  for (const readme of readmes) {
    assert.match(readme, /img\.shields\.io\/npm\/dt\/dsh-reasoning-slider/)
    assert.doesNotMatch(readme, /img\.shields\.io\/npm\/d(?:m|w|y)\/dsh-reasoning-slider/)
  }
})

test('release reuses one accepted package and publishes npm through OIDC', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
  assert.match(workflow, /id-token:\s*write/)
  assert.match(workflow, /npm publish \.release-artifact\/dsh-reasoning-slider\.tgz --access public/)
  assert.match(workflow, /gh release download[^\n]*\$RELEASE_TAG/s)
  assert.match(workflow, /actions\/download-artifact@v8/)
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN/)
})

test('release is main-only, immutable, and uses current action runtimes', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
  assert.match(workflow, /refs\/heads\/main/)
  assert.match(workflow, /already published; immutable assets will not be replaced/)
  assert.match(workflow, /actions\/checkout@v7/)
  assert.match(workflow, /pnpm\/action-setup@v6/)
  assert.match(workflow, /actions\/setup-node@v7/)
})

test('release carries both the accepted package and installer between jobs', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
  assert.match(workflow, /path:\s*\|[\s\S]*\.candidate\/dsh-reasoning-slider\.tgz[\s\S]*\.candidate\/install\.ps1/)
  assert.match(workflow, /gh release create[^\n]*\.candidate\/dsh-reasoning-slider\.tgz \.candidate\/install\.ps1/)
})

test('publication waits for installed official DSH acceptance of the exact candidate', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
  assert.match(workflow, /official-acceptance:[\s\S]*accept-official-release\.ps1[\s\S]*dsh-reasoning-slider\.tgz/u)
  assert.match(workflow, /release:[\s\S]*needs:\s*\[[^\]]*official-acceptance[^\]]*\]/u)
})
