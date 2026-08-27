import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EnergyField } from '../src/energy.jsx'
import { DEFAULT_COLORS, PALETTE_PRESETS, energyIntensity } from '../src/policy.js'

const LEVELS = ['Off', 'Low', 'High', 'Max']
const DEFAULTS = structuredClone(DEFAULT_COLORS)
function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function ThemePaletteControl({ label, presets, value, onChange }) {
  const update = (role, next) => onChange({ ...value, [role]: next })
  return <div className="palette"><span>{label}</span><div className="paired-presets">{presets.map(preset => <button key={preset.id} type="button" aria-label={`${label} ${preset.id}`} className={preset.main === value.main && preset.base === value.base ? 'selected' : ''} onClick={() => onChange({ main: preset.main, base: preset.base })}><i style={{ background: preset.main }} /><i style={{ background: preset.base }} /></button>)}</div><div className="palette-editor"><label>Effect<input aria-label={`${label} effect color`} type="color" value={value.main} onChange={event => update('main', event.currentTarget.value)} /></label><label>Track<input aria-label={`${label} track color`} type="color" value={value.base} onChange={event => update('base', event.currentTarget.value)} /></label></div></div>
}

function ThemePreview({ active, colors, dark, intensity, level, ratio }) {
  const palette = dark ? colors.dark : colors.light
  return <article className="theme-preview" data-tone={dark ? 'dark' : 'light'}>
    <header><span>{dark ? 'Dark · additive light' : 'Light · subtractive color'}</span><strong>{LEVELS[level]}</strong></header>
    <div className="track comparison-track" style={{ '--demo-base': palette.base, '--demo-opacity': ratio > 0 ? (dark ? 1 : .92) : 0, '--demo-thumb-center': `calc(14px + (100% - 28px) * ${ratio})` }}>
      <div className="dots">{LEVELS.map(name => <i key={name} />)}</div>
      <EnergyField active={active} baseColor={palette.base} color={palette.main} intensity={intensity} light={!dark} ratio={ratio} />
      <div className="thumb" />
    </div>
  </article>
}

function Demo() {
  const [preview, setPreview] = useState(100)
  const [theme, setTheme] = useState('system')
  const [dark, setDark] = useState(prefersDark)
  const [colors, setColors] = useState(DEFAULTS)
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)
  const settleTimer = useRef(0)
  const dragTimer = useRef(0)
  const draggingRef = useRef(false)
  const rangeRef = useRef(null)
  useEffect(() => {
    if (theme !== 'system') { setDark(theme === 'dark'); return undefined }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(query.matches)
    sync(); query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])
  useEffect(() => () => { window.clearTimeout(settleTimer.current); window.clearTimeout(dragTimer.current) }, [])
  const ratio = preview / 100
  const active = dragging || settling
  const charged = ratio > 0
  const energized = ratio > 0 && (active || preview >= 99.95)
  const displayLevel = Math.round(ratio * (LEVELS.length - 1))
  const intensity = energyIntensity(ratio)
  const palette = dark ? colors.dark : colors.light
  const color = palette.main
  const baseColor = palette.base
  const snap = value => {
    draggingRef.current = false
    window.clearTimeout(dragTimer.current)
    const next = Math.round((Number(value) / 100) * (LEVELS.length - 1))
    setDragging(false); setPreview((next / (LEVELS.length - 1)) * 100)
    window.clearTimeout(settleTimer.current)
    setSettling(next > 0)
    settleTimer.current = window.setTimeout(() => setSettling(false), next === LEVELS.length - 1 ? 1840 : 620)
  }
  const armDragTimer = () => {
    window.clearTimeout(dragTimer.current)
    dragTimer.current = window.setTimeout(() => {
      if (draggingRef.current) snap(rangeRef.current?.value ?? preview)
    }, 450)
  }
  const previewOnly = event => {
    setPreview(Number(event.currentTarget.value))
    if (draggingRef.current) armDragTimer()
  }
  const beginDrag = () => {
    draggingRef.current = true
    setDragging(true)
    armDragTimer()
  }
  const finishDrag = event => snap(event.currentTarget.value)
  return <main className="page" data-theme={dark ? 'dark' : 'light'}>
    <header className="hero">
      <p className="eyebrow">MODEL-AWARE REASONING CONTROL</p>
      <h1>Effort, made tangible.</h1>
      <p className="lede">One production cellular feedback field, tuned for constant motion and clear light and dark composition.</p>
      <div className="actions"><a className="primary" href="https://github.com/WSL043/dsh-reasoning-slider">View on GitHub</a><a href="https://www.npmjs.com/package/dsh-reasoning-slider">npm package</a></div>
    </header>
    <section className="demo-card" aria-label="Interactive reasoning effort slider">
      <div className="demo-head"><div><span className="label">Reasoning effort</span><strong>{LEVELS[displayLevel]}</strong></div><span className="live">Production renderer</span></div>
      <div className={`rail-shell ${displayLevel === 3 ? 'is-max' : ''}`} style={{ '--demo-color': color, '--demo-base': baseColor, '--demo-ratio': ratio, '--demo-thumb-center': `calc(14px + (100% - 28px) * ${ratio})`, '--demo-opacity': charged ? (dark ? 1 : .92) : 0 }}>
        <div className="levels">{LEVELS.map((name, index) => <button type="button" className={index === displayLevel ? 'current' : ''} key={name} onClick={() => snap((index / (LEVELS.length - 1)) * 100)}>{name}</button>)}</div>
        <div className="track">
          <div className="dots">{LEVELS.map(name => <i key={name} />)}</div>
          <EnergyField active={energized} baseColor={baseColor} color={color} intensity={intensity} light={!dark} ratio={ratio} />
          <div className="thumb" />
          <input ref={rangeRef} aria-label="Reasoning effort" aria-valuetext={LEVELS[displayLevel]} type="range" min="0" max="100" step="0.1" value={preview} onInput={previewOnly} onPointerDown={beginDrag} onPointerUp={finishDrag} onPointerLeave={event => { if (dragging) snap(event.currentTarget.value) }} onPointerCancel={() => snap(event.currentTarget.value)} onKeyUp={event => snap(event.currentTarget.value)} onBlur={event => { if (dragging) snap(event.currentTarget.value) }} />
        </div>
      </div>
      <div className="controls">
        <fieldset><legend>Appearance</legend><div className="segmented">{['system', 'dark', 'light'].map(value => <button type="button" className={theme === value ? 'selected' : ''} key={value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
        <div className="palettes"><ThemePaletteControl label="Light palette" presets={PALETTE_PRESETS.light} value={colors.light} onChange={value => setColors(current => ({ ...current, light: value }))} /><ThemePaletteControl label="Dark palette" presets={PALETTE_PRESETS.dark} value={colors.dark} onChange={value => setColors(current => ({ ...current, dark: value }))} /></div>
      </div>
    </section>
    <section className="theme-comparison" aria-label="Synchronized light and dark implementation comparison">
      <header><div><span className="label">Same motion field · same frame</span><strong>Two color implementations</strong></div><span className="live">Synchronized</span></header>
      <div className="theme-preview-grid"><ThemePreview active={energized} colors={colors} dark={false} intensity={intensity} level={displayLevel} ratio={ratio} /><ThemePreview active={energized} colors={colors} dark intensity={intensity} level={displayLevel} ratio={ratio} /></div>
    </section>
    <footer><span>Low and High retain a compact energy current. Max sustains the full burn.</span><span>Keyboard and reduced-motion friendly.</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<Demo />)
