import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EnergyField } from '../src/energy.jsx'
import { energyIntensity } from '../src/policy.js'

const LEVELS = ['Off', 'Low', 'High', 'Max']
const DEFAULTS = { dark: '#a857f7', light: '#8a49ca' }
const PRESETS = { light: ['#8a49ca', '#3769d8', '#a44d7d'], dark: ['#a857f7', '#66a4ff', '#ee72b7'] }

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function PaletteControl({ label, presets, value, onChange }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = next => {
    const normalized = next.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/u.test(normalized)) onChange(normalized)
    else setDraft(value)
  }
  return <label className="palette"><span>{label}</span><div className="palette-editor"><div className="swatches">{presets.map(color => <button key={color} type="button" aria-label={`${label} ${color}`} className={color === value ? 'selected' : ''} style={{ '--swatch': color }} onClick={() => onChange(color)} />)}</div><input aria-label={`${label} hex color`} value={draft} spellCheck="false" onChange={event => setDraft(event.currentTarget.value)} onBlur={event => commit(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') { commit(event.currentTarget.value); event.currentTarget.blur() } }} /></div></label>
}

function Demo() {
  const [level, setLevel] = useState(3)
  const [preview, setPreview] = useState(100)
  const [theme, setTheme] = useState('system')
  const [style, setStyle] = useState('continuous')
  const [dark, setDark] = useState(prefersDark)
  const [colors, setColors] = useState(DEFAULTS)
  useEffect(() => {
    if (theme !== 'system') { setDark(theme === 'dark'); return undefined }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(query.matches)
    sync(); query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])
  const ratio = preview / 100
  const intensity = energyIntensity(ratio)
  const color = dark ? colors.dark : colors.light
  const snap = value => {
    const next = Math.round((Number(value) / 100) * (LEVELS.length - 1))
    setLevel(next); setPreview((next / (LEVELS.length - 1)) * 100)
  }
  return <main className="page" data-theme={dark ? 'dark' : 'light'}>
    <header className="hero">
      <p className="eyebrow">MODEL-AWARE REASONING CONTROL</p>
      <h1>Effort, made tangible.</h1>
      <p className="lede">A clean-room cellular feedback field driven by the same renderer shipped in DSH Native Effort Slider.</p>
      <div className="actions"><a className="primary" href="https://github.com/WSL043/dsh-native-reasoning-slider">View on GitHub</a><a href="https://www.npmjs.com/package/dsh-native-reasoning-slider">npm package</a></div>
    </header>
    <section className="demo-card" aria-label="Interactive reasoning effort slider">
      <div className="demo-head"><div><span className="label">Reasoning effort</span><strong>{LEVELS[level]}</strong></div><span className="live">Live renderer</span></div>
      <div className={`rail-shell ${level === 3 ? 'is-max' : ''}`} style={{ '--demo-color': color, '--demo-ratio': ratio, '--demo-thumb-center': `calc(14px + (100% - 28px) * ${ratio})`, '--demo-opacity': .24 + intensity * .76 }}>
        <div className="levels">{LEVELS.map((name, index) => <button type="button" className={index === level ? 'current' : ''} key={name} onClick={() => { setLevel(index); setPreview((index / (LEVELS.length - 1)) * 100) }}>{name}</button>)}</div>
        <div className="track">
          <div className="track-bg" />
          <div className="dots">{LEVELS.map(name => <i key={name} />)}</div>
          <EnergyField active={style === 'reference' ? ratio >= 0.95 : ratio > 0} color={color} intensity={intensity} light={!dark} ratio={ratio} styleVariant={style} />
          <div className="thumb" />
          <input aria-label="Reasoning effort" aria-valuetext={LEVELS[level]} type="range" min="0" max="100" step="0.1" value={preview} onInput={event => setPreview(Number(event.currentTarget.value))} onPointerUp={event => snap(event.currentTarget.value)} onKeyUp={event => snap(event.currentTarget.value)} />
        </div>
      </div>
      <div className="controls">
        <fieldset><legend>Renderer</legend><div className="segmented">{[['continuous', 'Continuous'], ['reference', 'Reference'], ['compact', 'Compact · Beta']].map(([value, label]) => <button type="button" className={style === value ? 'selected' : ''} key={value} onClick={() => setStyle(value)}>{label}</button>)}</div></fieldset>
        <fieldset><legend>Appearance</legend><div className="segmented">{['system', 'dark', 'light'].map(value => <button type="button" className={theme === value ? 'selected' : ''} key={value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
        <div className="palettes"><PaletteControl label="Light palette" presets={PRESETS.light} value={colors.light} onChange={value => setColors(current => ({ ...current, light: value }))} /><PaletteControl label="Dark palette" presets={PRESETS.dark} value={colors.dark} onChange={value => setColors(current => ({ ...current, dark: value }))} /></div>
      </div>
    </section>
    <footer><span>Off stays silent. Low whispers. High gathers. Max fills the field.</span><span>Keyboard and reduced-motion friendly.</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<Demo />)
