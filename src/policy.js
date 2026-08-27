export const MODES = Object.freeze(['official', 'native', 'energy'])
export const DEFAULT_COLORS = Object.freeze({
  light: Object.freeze({ main: '#7c43c7', base: '#f0eff2' }),
  dark: Object.freeze({ main: '#a857f7', base: '#111015' }),
})
export const PALETTE_PRESETS = Object.freeze({
  light: Object.freeze([
    Object.freeze({ id: 'violet', main: '#7c43c7', base: '#f0eff2' }),
    Object.freeze({ id: 'blue', main: '#315fc6', base: '#eff1f4' }),
    Object.freeze({ id: 'teal', main: '#087f73', base: '#eef2f1' }),
    Object.freeze({ id: 'rose', main: '#9b3f72', base: '#f3eff1' }),
  ]),
  dark: Object.freeze([
    Object.freeze({ id: 'violet', main: '#a857f7', base: '#111015' }),
    Object.freeze({ id: 'blue', main: '#66a4ff', base: '#0d131d' }),
    Object.freeze({ id: 'teal', main: '#54d8c5', base: '#0e1716' }),
    Object.freeze({ id: 'rose', main: '#ee72b7', base: '#191015' }),
  ]),
})
const MAX_MODEL_COLORS = 64
const MAX_MODEL_KEY_PART = 256
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function normalizeColor(value, fallback) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback
}

function normalizeTheme(value, fallback) {
  if (typeof value === 'string') return { main: normalizeColor(value, fallback.main), base: fallback.base }
  if (value === null || typeof value !== 'object') return { ...fallback }
  return {
    main: normalizeColor(value.main, fallback.main),
    base: normalizeColor(value.base, fallback.base),
  }
}

function normalizePalette(value, fallback = DEFAULT_COLORS) {
  if (value === null || typeof value !== 'object') return fallback === null ? null : { ...fallback }
  if (fallback === null) {
    const light = normalizeTheme(value.light, DEFAULT_COLORS.light)
    const dark = normalizeTheme(value.dark, DEFAULT_COLORS.dark)
    const lightMain = typeof value.light === 'string' ? value.light : value.light?.main
    const darkMain = typeof value.dark === 'string' ? value.dark : value.dark?.main
    if (!HEX_COLOR.test(lightMain ?? '') || !HEX_COLOR.test(darkMain ?? '')) return null
    return { light, dark }
  }
  return {
    light: normalizeTheme(value.light, fallback.light),
    dark: normalizeTheme(value.dark, fallback.dark),
  }
}

export function modelColorKey(provider, model) {
  return JSON.stringify([String(provider ?? ''), String(model ?? '')])
}

function validModelKey(value) {
  if (typeof value !== 'string' || value.length > MAX_MODEL_KEY_PART * 2 + 16) return false
  try {
    const parts = JSON.parse(value)
    return Array.isArray(parts)
      && parts.length === 2
      && parts.every(part => typeof part === 'string' && part.length <= MAX_MODEL_KEY_PART)
      && JSON.stringify(parts) === value
  } catch { return false }
}

export function normalizeAppearance(value) {
  const source = value !== null && typeof value === 'object' ? value : {}
  const global = normalizePalette(source.global)
  const models = {}
  if (source.models !== null && typeof source.models === 'object') {
    for (const [key, palette] of Object.entries(source.models).slice(0, MAX_MODEL_COLORS)) {
      if (!validModelKey(key)) continue
      const normalized = normalizePalette(palette, null)
      if (normalized !== null) models[key] = normalized
    }
  }
  return { version: 2, scope: source.scope === 'model' ? 'model' : 'global', global, models }
}

export function resolveColors(appearance, provider, model) {
  const normalized = normalizeAppearance(appearance)
  if (normalized.scope !== 'model') return normalized.global
  return normalized.models[modelColorKey(provider, model)] ?? normalized.global
}

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

export function energyIntensity(ratio) {
  const bounded = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  const stops = [0, 0.24, 0.58, 1]
  const scaled = bounded * (stops.length - 1)
  const left = Math.min(stops.length - 2, Math.floor(scaled))
  const progress = scaled - left
  return stops[left] + (stops[left + 1] - stops[left]) * progress
}
