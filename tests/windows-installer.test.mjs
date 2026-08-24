import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const installerPath = new URL('../install.ps1', import.meta.url)
const releasePath = new URL('../.github/workflows/release.yml', import.meta.url)

test('the irm helper uses the official DSH plugin command and a fixed package version', async () => {
  const installer = await readFile(installerPath, 'utf8')
  assert.match(installer, /dsh-native-reasoning-slider@0\.1\.1/)
  assert.match(installer, /plugin['"],\s*['"]--profile['"],\s*['"]web['"],\s*['"]add['"]/) 
  assert.match(installer, /@deepseek-ai\/dsh@0\.1\.1-rc\.2/)
  assert.doesNotMatch(installer, /DSH_PORTABLE_ROOT|dsh\.exe|\\dsh\.exe/)
})

test('the release publishes the same installer used by the latest irm URL', async () => {
  const release = await readFile(releasePath, 'utf8')
  assert.match(release, /\.candidate\/install\.ps1/)
  assert.match(release, /irm 'https:\/\/github\.com\/WSL043\/dsh-native-reasoning-slider\/releases\/latest\/download\/install\.ps1' \| iex/)
})
