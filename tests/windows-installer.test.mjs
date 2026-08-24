import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const installerPath = new URL('../install.ps1', import.meta.url)
const releasePath = new URL('../.github/workflows/release.yml', import.meta.url)
const windowsTest = process.platform === 'win32' ? test : test.skip

test('the irm helper uses an existing official DSH command and never cold-installs the DSH dependency tree', async () => {
  const [installer, manifest, compatibility] = await Promise.all([
    readFile(installerPath, 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../compatibility.json', import.meta.url), 'utf8').then(JSON.parse),
  ])
  assert.match(installer, new RegExp(`dsh-native-reasoning-slider@${manifest.version.replaceAll('.', '\\.')}\\b`))
  assert.match(installer, /plugin['"],\s*['"]--profile['"],\s*['"]web['"],\s*['"]add['"]/) 
  assert.match(installer, /@deepseek-ai[\\\\/]dsh/u)
  assert.doesNotMatch(installer, /DSH_PORTABLE_ROOT|dsh\.exe|\\dsh\.exe/)
  assert.doesNotMatch(installer, /\bnpx\b|--prefer-offline|--no-audit|--no-fund/u)
  assert.match(installer, /DSH was not found[\s\S]*Install or start DeepSeek Harness/u)
})

windowsTest('a running official DSH is reused instead of starting npx', async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'dsh-slider-installer-'))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  const node = join(fixture, 'node.cmd')
  const bin = join(fixture, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  const nodeLog = join(fixture, 'node-args.txt')
  const npxLog = join(fixture, 'npx-args.txt')
  await mkdir(join(bin, '..'), { recursive: true })
  await writeFile(node, '@echo off\r\n>> "%DSH_INSTALLER_NODE_LOG%" echo %*\r\nexit /b 0\r\n')
  await writeFile(bin, '')
  await writeFile(join(fixture, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.1.1-rc.2' }))
  await writeFile(join(fixture, 'npx.cmd'), '@echo off\r\n>> "%DSH_INSTALLER_NPX_LOG%" echo %*\r\nexit /b 0\r\n')
  const quote = value => value.replaceAll("'", "''")
  const command = [
    `function global:Get-CimInstance { [pscustomobject]@{ ExecutablePath = '${quote(node)}'; CommandLine = '\"${quote(node)}\" \"${quote(bin)}\" web' } }`,
    `Get-Content -LiteralPath '${quote(installerPath.pathname.slice(1))}' -Raw -Encoding utf8 | Invoke-Expression`,
  ].join('; ')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    cwd: fixture,
    env: { ...process.env, PATH: `${fixture}${delimiter}${process.env.PATH ?? ''}`, DSH_INSTALLER_NODE_LOG: nodeLog, DSH_INSTALLER_NPX_LOG: npxLog },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.equal((await readFile(nodeLog, 'utf8')).trim(), `${bin} plugin --profile web add dsh-native-reasoning-slider@0.1.4`)
  await assert.rejects(readFile(npxLog, 'utf8'), /ENOENT/u)
})

windowsTest('a young package already locked in the profile gets one scoped release-age retry', async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'dsh-slider-release-age-'))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  const node = join(fixture, 'node.cmd')
  const bin = join(fixture, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  const nodeLog = join(fixture, 'node-args.txt')
  await mkdir(join(bin, '..'), { recursive: true })
  await writeFile(node, [
    '@echo off',
    '>> "%DSH_INSTALLER_NODE_LOG%" echo %*',
    'echo %* | findstr /c:"--config.minimumReleaseAge=0" >nul',
    'if errorlevel 1 (',
    '  echo [ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] existing-package@1.0.0 1>&2',
    '  exit /b 1',
    ')',
    'exit /b 0',
    '',
  ].join('\r\n'))
  await writeFile(bin, '')
  await writeFile(join(fixture, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.1.1-rc.2' }))
  const quote = value => value.replaceAll("'", "''")
  const command = [
    `function global:Get-CimInstance { [pscustomobject]@{ ExecutablePath = '${quote(node)}'; CommandLine = '\"${quote(node)}\" \"${quote(bin)}\" web' } }`,
    `Get-Content -LiteralPath '${quote(installerPath.pathname.slice(1))}' -Raw -Encoding utf8 | Invoke-Expression`,
  ].join('; ')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    cwd: fixture,
    env: { ...process.env, PATH: `${fixture}${delimiter}${process.env.PATH ?? ''}`, DSH_INSTALLER_NODE_LOG: nodeLog },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.deepEqual((await readFile(nodeLog, 'utf8')).trim().split(/\r?\n/u), [
    `${bin} plugin --profile web add dsh-native-reasoning-slider@0.1.4`,
    `${bin} plugin --profile web add --config.minimumReleaseAge=0 dsh-native-reasoning-slider@0.1.4`,
  ])
})

test('the release publishes the same installer used by the latest irm URL', async () => {
  const release = await readFile(releasePath, 'utf8')
  assert.match(release, /\.candidate\/install\.ps1/)
  assert.match(release, /irm 'https:\/\/github\.com\/WSL043\/dsh-native-reasoning-slider\/releases\/latest\/download\/install\.ps1' \| iex/)
})
