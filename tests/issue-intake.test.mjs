import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const workflow = new URL('../.github/workflows/issue-intake.yml', import.meta.url)
const bugForm = new URL('../.github/ISSUE_TEMPLATE/bug-report.yml', import.meta.url)
const featureForm = new URL('../.github/ISSUE_TEMPLATE/feature-request.yml', import.meta.url)

test('issue forms label reports so intake can reply by type', async () => {
  const [bug, feature] = await Promise.all([readFile(bugForm, 'utf8'), readFile(featureForm, 'utf8')])
  assert.match(bug, /labels:\s*\n\s*- bug/u)
  assert.match(feature, /labels:\s*\n\s*- enhancement/u)
})

test('issue intake replies warmly only to recognized bug and feature reports', async () => {
  const source = await readFile(workflow, 'utf8')
  assert.match(source, /labelNames\.has\('bug'\)/)
  assert.match(source, /labelNames\.has\('enhancement'\)/)
  assert.match(source, /if \(!isBug && !isFeature\) return/)
  assert.match(source, /dsh-maintenance-ack/)
  assert.match(source, /dsh-feature-ack/)
  assert.match(source, /we\\?'ll reproduce it[\s\S]*follow up here/i)
  assert.match(source, /感谢反馈[\s\S]*同步核查结果/u)
  assert.match(source, /Thanks for the suggestion[\s\S]*fits this plugin\\?'s scope/i)
  assert.match(source, /感谢建议[\s\S]*适合由本插件负责/u)
  assert.doesNotMatch(source, /maintenance queue|implementation decision/i)
})
