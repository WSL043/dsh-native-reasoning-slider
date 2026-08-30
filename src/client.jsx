import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  IconCheckOutline16,
  IconChevronDownOutline14,
  IconWarningOutline16,
  Menu,
  Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { EnergyField } from './energy.jsx'
import {
  advertisedEfforts,
  DEFAULT_COLORS,
  energyIntensity,
  modelColorKey,
  normalizeAppearance,
  normalizeMode,
  PALETTE_PRESETS,
  resolveColors,
  snapEffort,
} from './policy.js'
import { CSS } from './styles.js'

export const name = 'dsh-reasoning-slider'
export const inject = ['slots', 'locale', 'modelDirectories', 'sessions']

const SLOT = 'conversation.input.model'
const SETTINGS_SLOT = 'settings.section'
const STORAGE_KEY = 'dsh-reasoning-slider.mode'
const APPEARANCE_KEY = 'dsh-reasoning-slider.appearance.v1'
const LEGACY_STORAGE_KEY = 'dsh-native-reasoning-slider.mode'
const LEGACY_APPEARANCE_KEY = 'dsh-native-reasoning-slider.appearance.v1'
const listeners = new Set()
const appearanceListeners = new Set()
const modelChoiceListeners = new Set()

function storedMode() {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    const legacy = current === null ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null
    const value = current ?? legacy
    if (current === null && legacy !== null) window.localStorage.setItem(STORAGE_KEY, legacy)
    return normalizeMode(value)
  } catch { return 'energy' }
}

let currentMode = typeof window === 'undefined' ? 'energy' : storedMode()
export const modeStore = {
  getSnapshot: () => currentMode,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  set(mode, persist = true) {
    const next = normalizeMode(mode)
    if (next === currentMode) return
    currentMode = next
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* preference stays in memory */ }
    }
    listeners.forEach(listener => listener())
  },
}

function storedAppearance() {
  try {
    const current = window.localStorage.getItem(APPEARANCE_KEY)
    const legacy = current === null ? window.localStorage.getItem(LEGACY_APPEARANCE_KEY) : null
    const value = current ?? legacy
    if (current === null && legacy !== null) window.localStorage.setItem(APPEARANCE_KEY, legacy)
    return normalizeAppearance(JSON.parse(value ?? 'null'))
  } catch { return normalizeAppearance(null) }
}

let currentAppearance = typeof window === 'undefined' ? normalizeAppearance(null) : storedAppearance()
export const appearanceStore = {
  getSnapshot: () => currentAppearance,
  subscribe(listener) { appearanceListeners.add(listener); return () => appearanceListeners.delete(listener) },
  set(value, persist = true) {
    const next = normalizeAppearance(value)
    if (JSON.stringify(next) === JSON.stringify(currentAppearance)) return
    currentAppearance = next
    if (persist) {
      try { window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)) } catch { /* preference stays in memory */ }
    }
    appearanceListeners.forEach(listener => listener())
  },
  setScope(scope) { this.set({ ...currentAppearance, scope }) },
  setGlobal(theme, role, color) { this.set({ ...currentAppearance, global: { ...currentAppearance.global, [theme]: { ...currentAppearance.global[theme], [role]: color } } }) },
  setGlobalTheme(theme, palette) { this.set({ ...currentAppearance, global: { ...currentAppearance.global, [theme]: palette } }) },
  setModel(provider, model, theme, role, color) {
    const key = modelColorKey(provider, model)
    const base = resolveColors({ ...currentAppearance, scope: 'model' }, provider, model)
    this.set({ ...currentAppearance, models: { ...currentAppearance.models, [key]: { ...base, [theme]: { ...base[theme], [role]: color } } } })
  },
  setModelTheme(provider, model, theme, palette) {
    const key = modelColorKey(provider, model)
    const base = resolveColors({ ...currentAppearance, scope: 'model' }, provider, model)
    this.set({ ...currentAppearance, models: { ...currentAppearance.models, [key]: { ...base, [theme]: palette } } })
  },
}

let modelColorChoices = []
export const modelChoicesStore = {
  getSnapshot: () => modelColorChoices,
  subscribe(listener) { modelChoiceListeners.add(listener); return () => modelChoiceListeners.delete(listener) },
  set(choices) {
    const next = choices.map(choice => ({ ...choice }))
    if (JSON.stringify(next) === JSON.stringify(modelColorChoices)) return
    modelColorChoices = next
    modelChoiceListeners.forEach(listener => listener())
  },
}

const LOCALES = {
  en: {
    settingsNav: 'Effort · Beta', settingsPageDescription: 'Beta: choose how reasoning effort appears and behaves for every model that publishes effort levels.',
    settingTitle: 'Reasoning control', settingDescription: 'Use the official menu, a quiet native slider, or transient energy effects.',
    official: 'Official', native: 'Native', energy: 'Energy', model: 'Model', effort: 'Effort', retry: 'Retry',
    colorAssignment: 'Energy colors', colorDescription: 'Use one palette for every model, or remember a palette for each model.',
    allModels: 'All models', eachModel: 'Per model', lightPalette: 'Light palette', darkPalette: 'Dark palette', effectColor: 'Effect', trackColor: 'Track', resetPalette: 'Reset',
    lightPaletteDescription: 'Paired presets keep the effect visible without muddying the light track.', darkPaletteDescription: 'Paired presets preserve the bright core and dark contrast.',
    allModelColors: 'Default palette', allModelColorsDescription: 'Used by every model unless per-model colors are enabled.',
    modelColors: 'Model palette', modelColorsDescription: 'Choose a model, then set its light and dark colors here.',
    loading: 'Loading models…', noModels: 'No available models.', noEfforts: 'This model does not expose reasoning effort levels.',
    selectionFailed: 'The setting was not saved. {message}', groupFailed: '{name}: {message}', selectModel: 'Select model',
  },
  zh: {
    settingsNav: '推理滑块 · Beta', settingsPageDescription: 'Beta：设置所有已公布推理档位的模型如何显示和切换推理强度。',
    settingTitle: '推理强度控制', settingDescription: '可切换官方菜单、安静的原生滑块或短暂能量特效。',
    official: '官方', native: '原生', energy: '能量', model: '模型', effort: '推理强度', retry: '重试',
    colorAssignment: '能量配色', colorDescription: '所有模型使用一套配色，或分别记住每个模型的配色。',
    allModels: '全部模型', eachModel: '按模型', lightPalette: '浅色配色', darkPalette: '深色配色', effectColor: '效果色', trackColor: '轨道底色', resetPalette: '恢复推荐',
    lightPaletteDescription: '成套预设保证效果清晰，同时避免浅色轨道发灰发脏。', darkPaletteDescription: '成套预设保留亮核与暗色轨道的对比。',
    allModelColors: '默认配色', allModelColorsDescription: '未启用按模型配色时，所有模型使用这组颜色。',
    modelColors: '模型配色', modelColorsDescription: '先选择模型，再在这里设置它的浅色和深色配色。',
    loading: '正在加载模型…', noModels: '没有可用模型。', noEfforts: '当前模型未提供推理强度档位。',
    selectionFailed: '设置未保存。{message}', groupFailed: '{name}：{message}', selectModel: '选择模型',
  },
}

function useDarkTheme() {
  const read = () => document.body.hasAttribute('data-ds-dark-theme')
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()))
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

function EffortSlider({ current, reasoning, select, busy, mode, onFailure, t }) {
  const appearance = useSyncExternalStore(appearanceStore.subscribe, appearanceStore.getSnapshot)
  const dark = useDarkTheme()
  const efforts = advertisedEfforts(reasoning)
  const effective = current?.reasoningEffort ?? reasoning?.defaultEffort
  const currentIndex = Math.max(0, efforts.findIndex(entry => entry.id === effective))
  const committed = efforts.length < 2 ? 0 : (currentIndex / (efforts.length - 1)) * 100
  const [preview, setPreview] = useState(committed)
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)
  const committing = useRef(false)
  const settleTimer = useRef(0)
  const dragTimer = useRef(0)
  const draggingRef = useRef(false)
  const rangeRef = useRef(null)
  useEffect(() => { if (!dragging && !committing.current) setPreview(committed) }, [committed, dragging])
  useEffect(() => () => { committing.current = false; window.clearTimeout(settleTimer.current); window.clearTimeout(dragTimer.current) }, [])

  if (current === null || efforts.length < 2) return <div className="nrs-empty">{t('noEfforts')}</div>
  const snapped = snapEffort(efforts, preview)
  const active = dragging || settling
  const ratio = preview / 100
  const sliderStep = 100 / (efforts.length - 1)
  const charged = ratio > 0
  const energized = ratio > 0 && (active || preview >= 99.95)
  const intensity = energyIntensity(ratio)
  const colors = resolveColors(appearance, current.provider, current.model)
  const palette = dark ? colors.dark : colors.light
  const energyColor = palette.main
  const energyBase = palette.base
  const commitAt = async position => {
    draggingRef.current = false
    window.clearTimeout(dragTimer.current)
    setDragging(false)
    if (committing.current) return
    const effort = snapEffort(efforts, position)
    if (effort === undefined) return
    const nextPosition = (efforts.findIndex(entry => entry.id === effort.id) / (efforts.length - 1)) * 100
    setPreview(nextPosition)
    window.clearTimeout(settleTimer.current)
    setSettling(true)
    const max = effort.id === efforts[efforts.length - 1].id
    settleTimer.current = window.setTimeout(() => setSettling(false), max ? 1840 : 620)
    if (effort.id === effective) return
    committing.current = true
    const accepted = await select({ provider: current.provider, model: current.model, reasoningEffort: effort.id })
    committing.current = false
    if (!accepted) { setPreview(committed); onFailure() }
  }
  const armDragTimer = () => {
    window.clearTimeout(dragTimer.current)
    dragTimer.current = window.setTimeout(() => {
      if (draggingRef.current) void commitAt(Number(rangeRef.current?.value ?? preview))
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
  const finishDrag = event => { void commitAt(Number(event.currentTarget.value)) }
  const choose = async effort => {
    const index = efforts.findIndex(entry => entry.id === effort.id)
    const position = (index / (efforts.length - 1)) * 100
    setPreview(position)
    await commitAt(position)
  }
  const onSliderKeyDown = event => {
    let targetIndex
    const currentEffortIndex = Math.max(0, efforts.findIndex(entry => entry.id === snapped?.id))
    if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) targetIndex = Math.min(efforts.length - 1, currentEffortIndex + 1)
    else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) targetIndex = Math.max(0, currentEffortIndex - 1)
    else if (event.key === 'Home') targetIndex = 0
    else if (event.key === 'End') targetIndex = efforts.length - 1
    else return
    event.preventDefault()
    void choose(efforts[targetIndex])
  }
  const currentLabel = snapped?.name ?? effective ?? ''
  return (
    <section className={`nrs-effort ${mode === 'energy' ? 'is-energy' : ''} ${active ? 'is-active' : ''} ${preview >= 99 ? 'is-max' : ''}`} style={{ '--nrs-ratio': ratio, '--nrs-intensity': intensity, '--nrs-canvas-opacity': charged ? (dark ? 1 : .92) : 0, '--nrs-energy-opacity': dark ? .2 + intensity * .42 : .16 + intensity * .26, '--nrs-dots-opacity': 1 - intensity * .72, '--nrs-color': energyColor, '--nrs-base-color': energyBase }}>
      <div className="nrs-levels">
        {efforts.map(entry => <button type="button" className={`nrs-level ${snapped?.id === entry.id ? 'is-current' : ''}`} key={entry.id} disabled={busy} onClick={() => { void choose(entry) }}>{entry.name}</button>)}
      </div>
      <div className="nrs-track-wrap">
        <div className="nrs-track-dots" aria-hidden="true">{efforts.map(entry => <i key={entry.id} />)}</div>
        {mode === 'energy' ? <EnergyField active={energized} baseColor={energyBase} color={energyColor} intensity={intensity} light={!dark} ratio={ratio} /> : null}
        <div className="nrs-track-thumb" aria-hidden="true" />
        <input
          ref={rangeRef}
          className="nrs-range" type="range" min="0" max="100" step="0.1" value={preview} disabled={busy}
          aria-label={t('effort')} aria-valuetext={currentLabel}
          onInput={previewOnly}
          onPointerDown={beginDrag}
          onPointerUp={finishDrag}
          onPointerLeave={event => { if (dragging) void commitAt(Number(event.currentTarget.value)) }}
          onPointerCancel={() => { setDragging(false); setPreview(committed) }}
          onKeyDown={onSliderKeyDown}
          onBlur={event => { if (dragging) void commitAt(Number(event.currentTarget.value)) }}
        />
      </div>
    </section>
  )
}

function ModelSliderSelect({ locked, available, directory, load, select, t }) {
  const state = useSyncExternalStore(
    listener => directory.subscribe(listener),
    () => directory.getSnapshot(),
  )
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.getSnapshot)
  const [open, setOpen] = useState(null)
  const [toast, setToast] = useState(null)
  const rootRef = useRef(null)
  const modelTriggerRef = useRef(null)
  const effortTriggerRef = useRef(null)
  const effortPopoverRef = useRef(null)
  const itemRefs = useRef([])
  const id = useId()
  const [effortSide, setEffortSide] = useState('down')
  useEffect(() => { if (available) load() }, [available, load])
  useEffect(() => {
    if (!open) return undefined
    const closeOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(null) }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])
  useLayoutEffect(() => {
    if (open !== 'effort') return undefined
    const place = () => {
      const trigger = effortTriggerRef.current?.getBoundingClientRect()
      const panel = effortPopoverRef.current
      if (trigger === undefined || panel === null) return
      const below = window.innerHeight - trigger.bottom - 12
      const above = trigger.top - 12
      setEffortSide(below >= panel.offsetHeight || below >= above ? 'down' : 'up')
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  const choices = useMemo(() => state.groups.flatMap(group => group.models.map(model => ({ group, model }))), [state.groups])
  useEffect(() => {
    if (!available) { modelChoicesStore.set([]); return }
    modelChoicesStore.set(choices.map(({ group, model }) => ({
      id: modelColorKey(group.id, model.id),
      label: model.name,
      provider: group.id,
      model: model.id,
      current: state.current?.provider === group.id && state.current?.model === model.id,
    })))
  }, [available, choices, state.current?.provider, state.current?.model])
  if (!available) return null
  const currentChoice = state.current === null ? undefined : choices.find(entry => entry.group.id === state.current.provider && entry.model.id === state.current.model)
  const reasoning = currentChoice?.model.reasoning
  const effective = state.current?.reasoningEffort ?? reasoning?.defaultEffort
  const effortLabel = reasoning?.efforts.find(entry => entry.id === effective)?.name ?? effective
  const modelLabel = currentChoice?.model.name ?? t('selectModel')
  const busy = state.status === 'selecting'
  const close = (restoreFocus = false) => {
    const trigger = open === 'effort' ? effortTriggerRef : modelTriggerRef
    setOpen(null)
    if (restoreFocus) queueMicrotask(() => trigger.current?.focus())
  }
  const moveFocus = offset => {
    const items = itemRefs.current.filter(Boolean)
    if (items.length === 0) return
    const active = items.findIndex(item => item === document.activeElement)
    const next = (Math.max(active, 0) + offset + items.length) % items.length
    items[next]?.focus()
  }
  const onRootKeyDown = event => {
    if (event.key === 'Escape' && open !== null) {
      event.preventDefault()
      close(true)
      return
    }
    if (open === 'models' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    }
  }
  const onBlur = event => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
    close()
  }
  const failure = () => setToast({ id: Date.now(), text: t('selectionFailed', { message: directory.getSnapshot().error ?? '' }) })
  const chooseModel = async (group, model) => {
    const accepted = await select({ provider: group.id, model: model.id, ...(model.reasoning?.defaultEffort === undefined ? {} : { reasoningEffort: model.reasoning.defaultEffort }) })
    if (accepted) close(true); else failure()
  }
  itemRefs.current = []
  let itemIndex = 0
  const itemRef = () => {
    const at = itemIndex
    itemIndex += 1
    return node => { itemRefs.current[at] = node }
  }
  const efforts = advertisedEfforts(reasoning)
  const hasEfforts = state.current !== null && efforts.length >= 2
  return (
    <div ref={rootRef} className="nrs-root" onKeyDown={onRootKeyDown} onBlur={onBlur}>
      <div className="nrs-triggers">
        <button ref={modelTriggerRef} type="button" className="nrs-model-trigger" disabled={locked} aria-label={modelLabel} aria-haspopup="menu" aria-expanded={open === 'models'} aria-controls={open === 'models' ? `${id}-models` : undefined} onClick={() => { if (open === 'models') close(); else { setOpen('models'); load() } }}>
          <span className="nrs-trigger-model">{modelLabel}</span><IconChevronDownOutline14 className={`nrs-chevron ${open === 'models' ? 'is-open' : ''}`} />
        </button>
        {hasEfforts ? <button ref={effortTriggerRef} type="button" className="nrs-effort-trigger" disabled={locked || busy} aria-label={`${t('effort')} · ${effortLabel}`} aria-haspopup="dialog" aria-expanded={open === 'effort'} aria-controls={open === 'effort' ? `${id}-effort` : undefined} onClick={() => setOpen(open === 'effort' ? null : 'effort')}>
          <span>{effortLabel}</span><IconChevronDownOutline14 className={`nrs-chevron ${open === 'effort' ? 'is-open' : ''}`} />
        </button> : null}
      </div>
      {open === 'models' ? <div id={`${id}-models`} className="nrs-menu" role="menu" aria-busy={state.status === 'loading' || busy}>
          {state.status === 'loading' ? <div className="nrs-status">{t('loading')}</div> : null}
          {state.error !== null ? <div className="nrs-error"><span>{state.error}</span><button type="button" className="nrs-retry" onClick={load}>{t('retry')}</button></div> : null}
          {state.failures.map(failure => <div className="nrs-error" key={failure.id}><span>{t('groupFailed', { name: failure.name, message: failure.message })}</span><button type="button" className="nrs-retry" onClick={load}>{t('retry')}</button></div>)}
          <div className="nrs-models scrollable">{state.groups.map(group => <section className="nrs-group" role="group" key={group.id}><div className="nrs-group-title">{group.name}</div>{group.models.map(model => {
            const selected = state.current?.provider === group.id && state.current.model === model.id
            return <button ref={itemRef()} type="button" role="menuitemradio" aria-checked={selected} className="nrs-option" key={model.id} disabled={busy} onClick={() => { void chooseModel(group, model) }}><span className="nrs-option-copy"><span className="nrs-option-name">{model.name}</span>{model.description ? <span className="nrs-option-description">{model.description}</span> : null}</span><span className="nrs-check">{selected ? <IconCheckOutline16 /> : null}</span></button>
          })}</section>)}</div>
          {state.status === 'ready' && choices.length === 0 ? <div className="nrs-empty">{t('noModels')}</div> : null}
      </div> : null}
      {open === 'effort' ? <div ref={effortPopoverRef} id={`${id}-effort`} className={`nrs-effort-popover is-${effortSide}`} role="dialog" aria-label={t('effort')}>
        <EffortSlider current={state.current} reasoning={reasoning} select={select} busy={busy} mode={mode} onFailure={failure} t={t} />
      </div> : null}
      {toast ? <Toast key={toast.id} text={toast.text} icon={<IconWarningOutline16 />} anchor={rootRef.current?.closest('[data-composer-card]') ?? null} onDone={() => setToast(null)} /> : null}
    </div>
  )
}

function ColorInput({ disabled = false, label, onChange, value }) {
  return <label className={`nrs-color-control ${disabled ? 'is-disabled' : ''}`} title={label}><input type="color" value={value} aria-label={label} disabled={disabled} onChange={event => onChange(event.currentTarget.value)} /><span aria-hidden="true" style={{ background: value }} /><em>{label}</em></label>
}

function PaletteRow({ disabled, description, onChange, palette, presets, theme, title, t }) {
  const setRole = (role, value) => onChange({ ...palette, [role]: value })
  return <div className="nrs-mode-row nrs-palette-row">
    <div className="nrs-mode-copy"><div className="nrs-mode-title">{title}</div><div className="nrs-mode-description">{description}</div></div>
    <div className="nrs-palette-editor">
      <div className="nrs-preset-list" role="group" aria-label={title}>{presets.map((preset, index) => {
        const selected = preset.main === palette.main && preset.base === palette.base
        return <button type="button" className={`nrs-preset ${selected ? 'is-selected' : ''}`} aria-label={`${title} ${index + 1}`} aria-pressed={selected} disabled={disabled} key={preset.id} onClick={() => onChange({ main: preset.main, base: preset.base })}><i style={{ background: preset.main }} /><i style={{ background: preset.base }} /></button>
      })}</div>
      <div className="nrs-palette-fine-tune"><ColorInput disabled={disabled} label={`${title} · ${t('effectColor')}`} value={palette.main} onChange={value => setRole('main', value)} /><ColorInput disabled={disabled} label={`${title} · ${t('trackColor')}`} value={palette.base} onChange={value => setRole('base', value)} /><button type="button" className="nrs-reset-palette" disabled={disabled} onClick={() => onChange({ ...DEFAULT_COLORS[theme] })}>{t('resetPalette')}</button></div>
    </div>
  </div>
}

function SettingsMenu({ items, onSelect, selected, t }) {
  const [open, setOpen] = useState(false)
  return <Menu open={open} align="end" side="bottom" portal compact selectedId={selected} items={items.map(entry => ({ id: entry, label: t(entry) }))} onSelect={entry => { onSelect(entry); setOpen(false) }} onClose={() => setOpen(false)} anchor={<button type="button" className="nrs-mode-picker" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{t(selected)}</span><IconChevronDownOutline14 className={`nrs-chevron ${open ? 'is-open' : ''}`} /></button>} />
}

function ModelSettingsMenu({ choices, onSelect, selected, t }) {
  const [open, setOpen] = useState(false)
  const selectedChoice = choices.find(choice => choice.id === selected)
  return <Menu open={open} align="end" side="bottom" portal compact selectedId={selected} items={choices.map(choice => ({ id: choice.id, label: choice.label }))} onSelect={entry => { onSelect(entry); setOpen(false) }} onClose={() => setOpen(false)} anchor={<button type="button" className="nrs-mode-picker nrs-model-picker" disabled={choices.length === 0} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{selectedChoice?.label ?? t('selectModel')}</span><IconChevronDownOutline14 className={`nrs-chevron ${open ? 'is-open' : ''}`} /></button>} />
}

function PluginSettings({ t }) {
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.getSnapshot)
  const appearance = useSyncExternalStore(appearanceStore.subscribe, appearanceStore.getSnapshot)
  const modelColorChoices = useSyncExternalStore(modelChoicesStore.subscribe, modelChoicesStore.getSnapshot)
  const scope = appearance.scope === 'model' ? 'eachModel' : 'allModels'
  const [selectedPaletteModel, setSelectedPaletteModel] = useState('')
  useEffect(() => {
    if (modelColorChoices.some(choice => choice.id === selectedPaletteModel)) return
    setSelectedPaletteModel(modelColorChoices.find(choice => choice.current)?.id ?? modelColorChoices[0]?.id ?? '')
  }, [modelColorChoices, selectedPaletteModel])
  const selectedChoice = modelColorChoices.find(choice => choice.id === selectedPaletteModel)
  const palette = selectedChoice === undefined ? appearance.global : resolveColors({ ...appearance, scope: 'model' }, selectedChoice.provider, selectedChoice.model)
  const setThemePalette = (theme, next) => {
    if (appearance.scope === 'model' && selectedChoice !== undefined) appearanceStore.setModelTheme(selectedChoice.provider, selectedChoice.model, theme, next)
    else appearanceStore.setGlobalTheme(theme, next)
  }
  const paletteDisabled = appearance.scope === 'model' && selectedChoice === undefined
  return <section className="nrs-settings-page">
    <header className="nrs-settings-header"><h2>{t('settingTitle')}</h2><p>{t('settingsPageDescription')}</p></header>
    <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('settingTitle')}</div><div className="nrs-mode-description">{t('settingDescription')}</div></div><SettingsMenu items={['official', 'native', 'energy']} selected={mode} onSelect={modeStore.set} t={t} /></div>
    <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('colorAssignment')}</div><div className="nrs-mode-description">{t('colorDescription')}</div></div><SettingsMenu items={['allModels', 'eachModel']} selected={scope} onSelect={entry => appearanceStore.setScope(entry === 'eachModel' ? 'model' : 'global')} t={t} /></div>
    {appearance.scope === 'model' ? <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('modelColors')}</div><div className="nrs-mode-description">{t('modelColorsDescription')}</div></div><ModelSettingsMenu choices={modelColorChoices} selected={selectedPaletteModel} onSelect={setSelectedPaletteModel} t={t} /></div> : null}
    <PaletteRow disabled={paletteDisabled} description={t('lightPaletteDescription')} onChange={next => setThemePalette('light', next)} palette={palette.light} presets={PALETTE_PRESETS.light} theme="light" title={t('lightPalette')} t={t} />
    <PaletteRow disabled={paletteDisabled} description={t('darkPaletteDescription')} onChange={next => setThemePalette('dark', next)} palette={palette.dark} presets={PALETTE_PRESETS.dark} theme="dark" title={t('darkPalette')} t={t} />
  </section>
}

export function apply(ctx) {
  const sessions = ctx.get('sessions')
  if (ctx.get('modelDirectories') === undefined || sessions === undefined) return
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = name; style.textContent = CSS; document.head.appendChild(style)
    return () => style.remove()
  }, `${name}: styles`)
  ctx.effect(() => ctx.locale.register(name, LOCALES), `${name}: dictionaries`)
  const t = ctx.locale.bind(name)
  ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({ name: SETTINGS_SLOT, id: 'reasoning-effort', order: 26, label: () => t('settingsNav') }, () => <PluginSettings t={t} />))
  const installModelSeat = scope => scope.slots.inject(SLOT, () => {
    const modelDirectories = scope.get('modelDirectories')
    let disposeModelSeat
    const syncModelSeat = () => {
      if (modeStore.getSnapshot() === 'official') { disposeModelSeat?.(); disposeModelSeat = undefined; return }
      if (disposeModelSeat !== undefined) return
      disposeModelSeat = ctx.slots.register({
        name: SLOT,
        priority: -100,
        inject: sessionId => {
          const controller = modelDirectories.directoryFor(sessionId)
          const available = sessions.subagentAddress?.(sessionId) === undefined
          return {
            available,
            directory: controller.store,
            load: () => controller.load().then(() => undefined, () => undefined),
            select: selection => controller.select(selection).then(() => true, () => false),
            mode: modeStore.getSnapshot(),
            t,
          }
        },
      }, ModelSliderSelect)
    }
    syncModelSeat()
    const unsubscribe = modeStore.subscribe(syncModelSeat)
    return () => { unsubscribe(); disposeModelSeat?.() }
  })
  if (ctx.get('remote.session') === undefined) installModelSeat(ctx)
  else ctx.inject(['remote.session'], installModelSeat)
  ctx.effect(() => {
    const syncStorage = event => {
      if (event.key === STORAGE_KEY) modeStore.set(event.newValue, false)
      if (event.key === APPEARANCE_KEY) {
        try { appearanceStore.set(JSON.parse(event.newValue ?? 'null'), false) } catch { appearanceStore.set(null, false) }
      }
    }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, `${name}: preference sync`)
}
