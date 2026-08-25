import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_COLORS,
  MODES,
  advertisedEfforts,
  energyIntensity,
  normalizeEnergyStyle,
  modelColorKey,
  normalizeAppearance,
  normalizeMode,
  resolveColors,
  snapEffort,
} from '../src/policy.js'

test('energy intensity gives every four-level effort a deliberate visual weight', () => {
  assert.equal(energyIntensity(0), 0)
  assert.equal(energyIntensity(1 / 3), 0.24)
  assert.equal(energyIntensity(2 / 3), 0.58)
  assert.equal(energyIntensity(1), 1)
  assert.ok(energyIntensity(0.5) > 0.24 && energyIntensity(0.5) < 0.58)
})

test('mode preference supports official, native, and energy without inventing a fourth mode', () => {
  assert.deepEqual(MODES, ['official', 'native', 'energy'])
  assert.equal(normalizeMode('official'), 'official')
  assert.equal(normalizeMode('native'), 'native')
  assert.equal(normalizeMode('energy'), 'energy')
  assert.equal(normalizeMode('unknown'), 'energy')
  assert.equal(normalizeMode(null), 'energy')
})

test('energy presentation keeps continuous as the stable default, reference as compatibility, and compact as beta', () => {
  assert.equal(normalizeEnergyStyle('continuous'), 'continuous')
  assert.equal(normalizeEnergyStyle('reference'), 'reference')
  assert.equal(normalizeEnergyStyle('compact'), 'compact')
  assert.equal(normalizeEnergyStyle('unknown'), 'continuous')
  assert.equal(normalizeEnergyStyle(null), 'continuous')
})

test('the slider uses only exact effort levels advertised by the selected model', () => {
  const reasoning = {
    defaultEffort: 'high',
    efforts: [
      { id: 'off', name: 'Off' },
      { id: 'low', name: 'Low' },
      { id: 'high', name: 'High' },
      { id: 'max', name: 'Max' },
    ],
  }
  assert.deepEqual(advertisedEfforts(reasoning), reasoning.efforts)
  assert.deepEqual(advertisedEfforts(undefined), [])
  assert.deepEqual(advertisedEfforts({ efforts: [{ id: 'high', name: 'High' }] }), [])
})

test('continuous pointer positions snap to the nearest advertised effort on commit', () => {
  const efforts = [
    { id: 'off', name: 'Off' },
    { id: 'low', name: 'Low' },
    { id: 'high', name: 'High' },
    { id: 'max', name: 'Max' },
  ]
  assert.equal(snapEffort(efforts, -4)?.id, 'off')
  assert.equal(snapEffort(efforts, 16)?.id, 'off')
  assert.equal(snapEffort(efforts, 18)?.id, 'low')
  assert.equal(snapEffort(efforts, 83)?.id, 'high')
  assert.equal(snapEffort(efforts, 84)?.id, 'max')
  assert.equal(snapEffort(efforts, 104)?.id, 'max')
  assert.equal(snapEffort([], 50), undefined)
})

test('appearance preferences support one palette or model-specific palettes', () => {
  const global = normalizeAppearance({
    scope: 'global',
    global: { light: '#275fc7', dark: '#8c72ff' },
    models: {},
  })
  assert.deepEqual(resolveColors(global, 'openai', 'gpt-5'), global.global)

  const key = modelColorKey('deepseek', 'DeepSeek-V4-Flash')
  const perModel = normalizeAppearance({
    scope: 'model',
    global: global.global,
    models: { [key]: { light: '#087f73', dark: '#54d8c5' } },
  })
  assert.deepEqual(resolveColors(perModel, 'deepseek', 'DeepSeek-V4-Flash'), perModel.models[key])
  assert.deepEqual(resolveColors(perModel, 'openai', 'gpt-5'), perModel.global)
})

test('appearance normalization keeps distinct polished theme defaults and rejects unsafe values', () => {
  assert.deepEqual(DEFAULT_COLORS, { light: '#8a49ca', dark: '#a857f7' })
  assert.notEqual(DEFAULT_COLORS.light, DEFAULT_COLORS.dark)
  const normalized = normalizeAppearance({
    scope: 'invalid',
    global: { light: 'red', dark: '#ABCDEF' },
    models: {
      [modelColorKey('provider', 'valid')]: { light: '#123456', dark: '#654321' },
      [modelColorKey('provider', 'invalid')]: { light: 'transparent', dark: '#00000000' },
    },
  })
  assert.equal(normalized.scope, 'global')
  assert.equal(normalized.global.light, DEFAULT_COLORS.light)
  assert.equal(normalized.global.dark, '#abcdef')
  assert.equal(Object.keys(normalized.models).length, 1)
})

test('model color keys are collision-safe and bounded', () => {
  assert.notEqual(modelColorKey('a/b', 'c'), modelColorKey('a', 'b/c'))
  const models = Object.fromEntries(Array.from({ length: 80 }, (_, index) => [
    modelColorKey('provider', `model-${index}`),
    { light: '#123456', dark: '#654321' },
  ]))
  assert.equal(Object.keys(normalizeAppearance({ scope: 'model', models }).models).length, 64)
  assert.deepEqual(normalizeAppearance({ scope: 'model', models: Object.fromEntries([
    ['__proto__', { light: '#123456', dark: '#654321' }],
    ['not-json', { light: '#123456', dark: '#654321' }],
  ]) }).models, {})
})
