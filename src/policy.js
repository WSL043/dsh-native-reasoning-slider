export const MODES = Object.freeze(['official', 'native', 'energy'])

export function normalizeMode(value) {
  return MODES.includes(value) ? value : 'energy'
}

export function advertisedEfforts(reasoning) {
  const efforts = reasoning?.efforts
  if (!Array.isArray(efforts) || efforts.length < 2) return []
  return efforts.filter((entry) => (
    entry !== null
    && typeof entry === 'object'
    && typeof entry.id === 'string'
    && entry.id.length > 0
    && typeof entry.name === 'string'
    && entry.name.length > 0
  ))
}

export function snapEffort(efforts, position) {
  if (!Array.isArray(efforts) || efforts.length === 0) return undefined
  const bounded = Math.max(0, Math.min(100, Number.isFinite(position) ? position : 0))
  const index = Math.round((bounded / 100) * (efforts.length - 1))
  return efforts[index]
}

export function shouldAnimate({ mode, reducedMotion, active }) {
  return mode === 'energy' && reducedMotion !== true && active === true
}
