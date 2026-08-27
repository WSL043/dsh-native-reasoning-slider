import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_COLORS,
  MODES,
  PALETTE_PRESETS,
  advertisedEfforts,
  energyIntensity,
  modelColorKey,
  normalizeAppearance,
  normalizeMode,
  resolveColors,
  snapEffort,
} from '../src/policy.js'

test('energy intensity keeps deterministic weights for renderer input', () => {
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

test('energy presentation exposes paired light and dark palettes instead of renderer variants', () => {
  assert.equal(PALETTE_PRESETS.light.length, 4)
  assert.equal(PALETTE_PRESETS.dark.length, 4)
  assert.deepEqual({ main: PALETTE_PRESETS.light[0].main, base: PALETTE_PRESETS.light[0].base }, DEFAULT_COLORS.light)
  assert.deepEqual({ main: PALETTE_PRESETS.dark[0].main, base: PALETTE_PRESETS.dark[0].base }, DEFAULT_COLORS.dark)
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
    global: {
      light: { main: '#275fc7', base: '#e4eaf7' },
      dark: { main: '#8c72ff', base: '#15131d' },
    },
    models: {},
  })
  assert.deepEqual(resolveColors(global, 'openai', 'gpt-5'), global.global)

  const key = modelColorKey('deepseek', 'DeepSeek-V4-Flash')
  const perModel = normalizeAppearance({
    scope: 'model',
    global: global.global,
    models: { [key]: {
      light: { main: '#087f73', base: '#d8eeeb' },
      dark: { main: '#54d8c5', base: '#101b1a' },
    } },
  })
  assert.deepEqual(resolveColors(perModel, 'deepseek', 'DeepSeek-V4-Flash'), perModel.models[key])
  assert.deepEqual(resolveColors(perModel, 'openai', 'gpt-5'), perModel.global)
})

test('appearance normalization keeps distinct polished theme defaults and rejects unsafe values', () => {
  assert.deepEqual(DEFAULT_COLORS, {
    light: { main: '#7c43c7', base: '#f0eff2' },
    dark: { main: '#a857f7', base: '#111015' },
  })
  assert.notEqual(DEFAULT_COLORS.light.main, DEFAULT_COLORS.dark.main)
  const normalized = normalizeAppearance({
    scope: 'invalid',
    global: { light: { main: 'red', base: '#E8E1F2' }, dark: { main: '#ABCDEF', base: 'black' } },
    models: {
      [modelColorKey('provider', 'valid')]: { light: { main: '#123456', base: '#eeeeee' }, dark: { main: '#654321', base: '#111111' } },
      [modelColorKey('provider', 'invalid')]: { light: { main: 'transparent', base: '#eeeeee' }, dark: { main: '#00000000', base: '#111111' } },
    },
  })
  assert.equal(normalized.scope, 'global')
  assert.equal(normalized.global.light.main, DEFAULT_COLORS.light.main)
  assert.equal(normalized.global.light.base, '#e8e1f2')
  assert.equal(normalized.global.dark.main, '#abcdef')
  assert.equal(normalized.global.dark.base, DEFAULT_COLORS.dark.base)
  assert.equal(Object.keys(normalized.models).length, 1)
})

test('appearance normalization migrates version 1 main colors without losing user choices', () => {
  const normalized = normalizeAppearance({
    version: 1,
    scope: 'global',
    global: { light: '#275fc7', dark: '#8c72ff' },
  })
  assert.equal(normalized.version, 2)
  assert.deepEqual(normalized.global, {
    light: { main: '#275fc7', base: DEFAULT_COLORS.light.base },
    dark: { main: '#8c72ff', base: DEFAULT_COLORS.dark.base },
  })
})

test('model color keys are collision-safe and bounded', () => {
  assert.notEqual(modelColorKey('a/b', 'c'), modelColorKey('a', 'b/c'))
  const models = Object.fromEntries(Array.from({ length: 80 }, (_, index) => [
    modelColorKey('provider', `model-${index}`),
    { light: { main: '#123456', base: '#eeeeee' }, dark: { main: '#654321', base: '#111111' } },
  ]))
  assert.equal(Object.keys(normalizeAppearance({ scope: 'model', models }).models).length, 64)
  assert.deepEqual(normalizeAppearance({ scope: 'model', models: Object.fromEntries([
    ['__proto__', { light: { main: '#123456', base: '#eeeeee' }, dark: { main: '#654321', base: '#111111' } }],
    ['not-json', { light: { main: '#123456', base: '#eeeeee' }, dark: { main: '#654321', base: '#111111' } }],
  ]) }).models, {})
})
