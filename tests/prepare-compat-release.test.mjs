import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  compareVersions,
  planCompatibilityUpdate,
  selectNextUntestedVersion,
} from '../scripts/prepare-compat-release.mjs'

test('official DSH versions are processed in order', () => {
  assert.equal(compareVersions('0.1.1-rc.2', '0.1.1-rc.1'), 1)
  assert.equal(compareVersions('0.1.1', '0.1.1-rc.2'), 1)
  assert.equal(
    selectNextUntestedVersion(['0.1.2', '0.1.1-rc.4', '0.1.1-rc.3'], '0.1.1-rc.2'),
    '0.1.1-rc.3',
  )
})

test('a compatibility candidate bumps only plugin patch metadata and exact DSH peers', () => {
  const update = planCompatibilityUpdate({
    compatibility: { latestTested: '0.1.1-rc.2', supported: ['0.1.1-rc.2'] },
    manifest: {
      version: '0.1.1',
      devDependencies: {
        '@deepseek-ai/cordis': '4.0.1',
        '@deepseek-ai/dsh-client-runtime': '0.1.1-rc.2',
      },
      peerDependencies: {
        '@deepseek-ai/cordis': '4.0.1',
        '@deepseek-ai/dsh-client-runtime': '0.1.1-rc.2',
      },
    },
  }, '0.1.1-rc.3')

  assert.equal(update.pluginVersion, '0.1.2')
  assert.equal(update.compatibility.latestTested, '0.1.1-rc.3')
  assert.equal(update.manifest.devDependencies['@deepseek-ai/dsh-client-runtime'], '0.1.1-rc.3')
  assert.equal(update.manifest.peerDependencies['@deepseek-ai/dsh-client-runtime'], '0.1.1-rc.2 || 0.1.1-rc.3')
  assert.equal(update.manifest.peerDependencies['@deepseek-ai/cordis'], '4.0.1')
})

test('the compatibility workflow authenticates upstream and delegates publication', async () => {
  const workflow = await readFile(new URL('../.github/workflows/upstream-compatibility.yml', import.meta.url), 'utf8')
  assert.match(workflow, /cron: '41 \*\/3 \* \* \*'/)
  assert.match(workflow, /deepseek-ai\/deepseek-harness\/releases\/tags\/dsh-v/)
  assert.match(workflow, /\.immutable == true/)
  assert.match(workflow, /accept-official-release\.ps1/)
  assert.match(workflow, /workflow run release\.yml[^\n]+request_id/)
  assert.match(workflow, /gh run watch "\$release_run"/)
  assert.doesNotMatch(workflow, /npm publish/)
})

test('official DSH acceptance keeps global profile options before Web startup', async () => {
  const script = await readFile(new URL('../.github/scripts/accept-official-release.ps1', import.meta.url), 'utf8')
  assert.match(script, /@\('--profile', 'web', '--no-open', '--port'/)
  assert.doesNotMatch(script, /@\('web', '--profile'/)
})
