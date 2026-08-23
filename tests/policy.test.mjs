import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MODES,
  advertisedEfforts,
  normalizeMode,
  snapEffort,
  shouldAnimate,
} from '../src/policy.js'

test('mode preference supports official, native, and energy without inventing a fourth mode', () => {
  assert.deepEqual(MODES, ['official', 'native', 'energy'])
  assert.equal(normalizeMode('official'), 'official')
  assert.equal(normalizeMode('native'), 'native')
  assert.equal(normalizeMode('energy'), 'energy')
  assert.equal(normalizeMode('unknown'), 'energy')
  assert.equal(normalizeMode(null), 'energy')
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

test('energy animation is transient and respects reduced-motion', () => {
  assert.equal(shouldAnimate({ mode: 'energy', reducedMotion: false, active: true }), true)
  assert.equal(shouldAnimate({ mode: 'energy', reducedMotion: false, active: false }), false)
  assert.equal(shouldAnimate({ mode: 'native', reducedMotion: false, active: true }), false)
  assert.equal(shouldAnimate({ mode: 'energy', reducedMotion: true, active: true }), false)
})
