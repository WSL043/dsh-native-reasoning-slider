export const MODES = Object.freeze(['official', 'native', 'energy'])
export const ENERGY_STYLES = Object.freeze(['continuous', 'reference', 'compact'])
export const DEFAULT_COLORS = Object.freeze({ light: '#8a49ca', dark: '#a857f7' })
const MAX_MODEL_COLORS = 64
const MAX_MODEL_KEY_PART = 256
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function normalizeColor(value, fallback) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback
}

function normalizePalette(value, fallback = DEFAULT_COLORS) {
  if (value === null || typeof value !== 'object') return fallback === null ? null : { ...fallback }
  if (fallback === null) {
    if (!HEX_COLOR.test(value.light ?? '') || !HEX_COLOR.test(value.dark ?? '')) return null
    return { light: value.light.toLowerCase(), dark: value.dark.toLowerCase() }
  }
  return {
    light: normalizeColor(value.light, fallback.light),
    dark: normalizeColor(value.dark, fallback.dark),
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
  return { version: 1, scope: source.scope === 'model' ? 'model' : 'global', global, models }
}

export function resolveColors(appearance, provider, model) {
  const normalized = normalizeAppearance(appearance)
  if (normalized.scope !== 'model') return normalized.global
  return normalized.models[modelColorKey(provider, model)] ?? normalized.global
}

export function normalizeMode(value) {
  return MODES.includes(value) ? value : 'energy'
}

export function normalizeEnergyStyle(value) {
  return ENERGY_STYLES.includes(value) ? value : 'continuous'
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
