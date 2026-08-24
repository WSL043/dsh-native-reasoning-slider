import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const installerPath = new URL('../install.ps1', import.meta.url)
const releasePath = new URL('../.github/workflows/release.yml', import.meta.url)

test('the irm helper uses the official DSH plugin command and a fixed package version', async () => {
  const [installer, manifest, compatibility] = await Promise.all([
    readFile(installerPath, 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../compatibility.json', import.meta.url), 'utf8').then(JSON.parse),
  ])
  assert.match(installer, new RegExp(`dsh-native-reasoning-slider@${manifest.version.replaceAll('.', '\\.')}\\b`))
  assert.match(installer, /plugin['"],\s*['"]--profile['"],\s*['"]web['"],\s*['"]add['"]/) 
  assert.match(installer, new RegExp(`@deepseek-ai/dsh@${compatibility.latestTested.replaceAll('.', '\\.')}\\b`))
  assert.doesNotMatch(installer, /DSH_PORTABLE_ROOT|dsh\.exe|\\dsh\.exe/)
})

test('the release publishes the same installer used by the latest irm URL', async () => {
  const release = await readFile(releasePath, 'utf8')
  assert.match(release, /\.candidate\/install\.ps1/)
  assert.match(release, /irm 'https:\/\/github\.com\/WSL043\/dsh-native-reasoning-slider\/releases\/latest\/download\/install\.ps1' \| iex/)
})
