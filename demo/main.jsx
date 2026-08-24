import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EnergyField } from '../src/energy.jsx'
import { energyIntensity } from '../src/policy.js'

const LEVELS = ['Off', 'Low', 'High', 'Max']
const DEFAULTS = { dark: '#a857f7', light: '#8a49ca' }

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function Demo() {
  const [level, setLevel] = useState(3)
  const [theme, setTheme] = useState('system')
  const [dark, setDark] = useState(prefersDark)
  const [colors, setColors] = useState(DEFAULTS)
  useEffect(() => {
    if (theme !== 'system') { setDark(theme === 'dark'); return undefined }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(query.matches)
    sync(); query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])
  const ratio = level / (LEVELS.length - 1)
  const intensity = energyIntensity(ratio)
  const color = dark ? colors.dark : colors.light
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
        <div className="levels">{LEVELS.map((name, index) => <button type="button" className={index === level ? 'current' : ''} key={name} onClick={() => setLevel(index)}>{name}</button>)}</div>
        <div className="track">
          <div className="track-bg" />
          <div className="dots">{LEVELS.map(name => <i key={name} />)}</div>
          <EnergyField active={level > 0} color={color} intensity={intensity} light={!dark} ratio={ratio} styleVariant="reference" />
          <div className="thumb" />
          <input aria-label="Reasoning effort" aria-valuetext={LEVELS[level]} type="range" min="0" max="3" step="1" value={level} onInput={event => setLevel(Number(event.currentTarget.value))} />
        </div>
      </div>
      <div className="controls">
        <fieldset><legend>Appearance</legend><div className="segmented">{['system', 'dark', 'light'].map(value => <button type="button" className={theme === value ? 'selected' : ''} key={value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
        <label className="color"><span>{dark ? 'Dark color' : 'Light color'}</span><input type="color" value={dark ? colors.dark : colors.light} onChange={event => setColors(current => ({ ...current, [dark ? 'dark' : 'light']: event.currentTarget.value }))} /></label>
      </div>
    </section>
    <footer><span>Off stays silent. Low whispers. High gathers. Max fills the field.</span><span>Keyboard and reduced-motion friendly.</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<Demo />)
