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
  modelColorKey,
  normalizeAppearance,
  normalizeMode,
  resolveColors,
  snapEffort,
} from './policy.js'
import { CSS } from './styles.js'

export const name = 'dsh-native-reasoning-slider'
export const inject = ['slots', 'locale', 'modelDirectories', 'sessions']

const SLOT = 'conversation.input.model'
const SETTINGS_SLOT = 'settings.general.item'
const STORAGE_KEY = 'dsh-native-reasoning-slider.mode'
const APPEARANCE_KEY = 'dsh-native-reasoning-slider.appearance.v1'
const listeners = new Set()
const appearanceListeners = new Set()

function storedMode() {
  try { return normalizeMode(window.localStorage.getItem(STORAGE_KEY)) } catch { return 'energy' }
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
  try { return normalizeAppearance(JSON.parse(window.localStorage.getItem(APPEARANCE_KEY) ?? 'null')) } catch { return normalizeAppearance(null) }
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
  setGlobal(theme, color) { this.set({ ...currentAppearance, global: { ...currentAppearance.global, [theme]: color } }) },
  setModel(provider, model, theme, color) {
    const key = modelColorKey(provider, model)
    const base = resolveColors({ ...currentAppearance, scope: 'model' }, provider, model)
    this.set({ ...currentAppearance, models: { ...currentAppearance.models, [key]: { ...base, [theme]: color } } })
  },
}

const LOCALES = {
  en: {
    settingTitle: 'Reasoning control', settingDescription: 'Use the official menu, a quiet native slider, or transient energy effects.',
    official: 'Official', native: 'Native', energy: 'Energy', model: 'Model', effort: 'Effort', retry: 'Retry',
    colorAssignment: 'Energy colors', colorDescription: 'Use one palette for every model, or remember a palette for each model.',
    allModels: 'All models', eachModel: 'Per model', lightColor: 'Light appearance', darkColor: 'Dark appearance',
    modelColors: 'Model colors', modelColorsDescription: 'This palette applies to the selected model.',
    loading: 'Loading models…', noModels: 'No available models.', noEfforts: 'This model does not expose reasoning effort levels.',
    selectionFailed: 'The setting was not saved. {message}', groupFailed: '{name}: {message}', selectModel: 'Select model',
  },
  zh: {
    settingTitle: '推理强度控制', settingDescription: '可切换官方菜单、安静的原生滑块或短暂能量特效。',
    official: '官方', native: '原生', energy: '能量', model: '模型', effort: '推理强度', retry: '重试',
    colorAssignment: '能量配色', colorDescription: '所有模型使用一套配色，或分别记住每个模型的配色。',
    allModels: '全部模型', eachModel: '按模型', lightColor: '浅色外观', darkColor: '深色外观',
    modelColors: '模型配色', modelColorsDescription: '这组配色仅应用于当前模型。',
    loading: '正在加载模型…', noModels: '没有可用模型。', noEfforts: '当前模型未提供推理强度档位。',
    selectionFailed: '设置未保存。{message}', groupFailed: '{name}：{message}', selectModel: '选择模型',
  },
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (query === undefined) return undefined
    const update = () => setReduced(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
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
  const reducedMotion = useReducedMotion()
  const efforts = advertisedEfforts(reasoning)
  const effective = current?.reasoningEffort ?? reasoning?.defaultEffort
  const currentIndex = Math.max(0, efforts.findIndex(entry => entry.id === effective))
  const committed = efforts.length < 2 ? 0 : (currentIndex / (efforts.length - 1)) * 100
  const [preview, setPreview] = useState(committed)
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)
  const committing = useRef(false)
  const settleTimer = useRef(0)
  useEffect(() => { if (!dragging && !committing.current) setPreview(committed) }, [committed, dragging])
  useEffect(() => () => { committing.current = false; window.clearTimeout(settleTimer.current) }, [])

  if (current === null || efforts.length < 2) return <div className="nrs-empty">{t('noEfforts')}</div>
  const snapped = snapEffort(efforts, preview)
  const active = dragging || settling
  const ratio = preview / 100
  const intensity = ratio === 0 ? 0 : .18 + Math.pow(ratio, .82) * .82
  const colors = resolveColors(appearance, current.provider, current.model)
  const energyColor = dark ? colors.dark : colors.light
  const previewOnly = event => setPreview(Number(event.currentTarget.value))
  const commitAt = async position => {
    setDragging(false)
    if (committing.current) return
    const effort = snapEffort(efforts, position)
    if (effort === undefined) return
    const nextPosition = (efforts.findIndex(entry => entry.id === effort.id) / (efforts.length - 1)) * 100
    setPreview(nextPosition)
    window.clearTimeout(settleTimer.current)
    setSettling(true)
    settleTimer.current = window.setTimeout(() => setSettling(false), effort.id === efforts[efforts.length - 1].id ? 1840 : 620)
    if (effort.id === effective) return
    committing.current = true
    const accepted = await select({ provider: current.provider, model: current.model, reasoningEffort: effort.id })
    committing.current = false
    if (!accepted) { setPreview(committed); onFailure() }
  }
  const choose = async effort => {
    const index = efforts.findIndex(entry => entry.id === effort.id)
    const position = (index / (efforts.length - 1)) * 100
    setPreview(position)
    await commitAt(position)
  }
  const currentLabel = snapped?.name ?? effective ?? ''
  return (
    <section className={`nrs-effort ${mode === 'energy' ? 'is-energy' : ''} ${active ? 'is-active' : ''} ${preview >= 99 ? 'is-max' : ''}`} style={{ '--nrs-ratio': ratio, '--nrs-color': energyColor }}>
      <div className="nrs-levels">
        {efforts.map(entry => <button type="button" className={`nrs-level ${snapped?.id === entry.id ? 'is-current' : ''}`} key={entry.id} disabled={busy} onClick={() => { void choose(entry) }}>{entry.name}</button>)}
      </div>
      <div className="nrs-track-wrap">
        <div className="nrs-track-fill" aria-hidden="true" />
        <div className="nrs-track-glow" aria-hidden="true" />
        <div className="nrs-track-flare" aria-hidden="true" />
        {mode === 'energy' ? <EnergyField active={active} color={energyColor} intensity={intensity} light={!dark} ratio={ratio} reducedMotion={reducedMotion} /> : null}
        <div className="nrs-track-thumb" aria-hidden="true" />
        <input
          className="nrs-range" type="range" min="0" max="100" step="0.1" value={preview} disabled={busy}
          aria-label={t('effort')} aria-valuetext={currentLabel}
          onInput={previewOnly}
          onPointerDown={() => setDragging(true)}
          onPointerUp={event => { void commitAt(Number(event.currentTarget.value)) }}
          onPointerCancel={() => { setDragging(false); setPreview(committed) }}
          onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) void commitAt(Number(event.currentTarget.value)) }}
          onBlur={event => { if (dragging) void commitAt(Number(event.currentTarget.value)) }}
        />
      </div>
      {mode === 'energy' && appearance.scope === 'model' ? <div className="nrs-model-colors"><span className="nrs-model-colors-copy"><strong>{t('modelColors')}</strong><small>{t('modelColorsDescription')}</small></span><ColorInput label={t('lightColor')} value={colors.light} onChange={value => appearanceStore.setModel(current.provider, current.model, 'light', value)} /><ColorInput label={t('darkColor')} value={colors.dark} onChange={value => appearanceStore.setModel(current.provider, current.model, 'dark', value)} /></div> : null}
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

function ColorInput({ label, onChange, value }) {
  return <label className="nrs-color-control" title={label}><input type="color" value={value} aria-label={label} onChange={event => onChange(event.currentTarget.value)} /><span aria-hidden="true" style={{ background: value }} /></label>
}

function SettingsMenu({ items, onSelect, selected, t }) {
  const [open, setOpen] = useState(false)
  return <Menu open={open} align="end" side="bottom" portal compact selectedId={selected} items={items.map(entry => ({ id: entry, label: t(entry) }))} onSelect={entry => { onSelect(entry); setOpen(false) }} onClose={() => setOpen(false)} anchor={<button type="button" className="nrs-mode-picker" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{t(selected)}</span><IconChevronDownOutline14 className={`nrs-chevron ${open ? 'is-open' : ''}`} /></button>} />
}

function PluginSettings({ t }) {
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.getSnapshot)
  const appearance = useSyncExternalStore(appearanceStore.subscribe, appearanceStore.getSnapshot)
  const scope = appearance.scope === 'model' ? 'eachModel' : 'allModels'
  return <>
    <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('settingTitle')}</div><div className="nrs-mode-description">{t('settingDescription')}</div></div><SettingsMenu items={['official', 'native', 'energy']} selected={mode} onSelect={modeStore.set} t={t} /></div>
    <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('colorAssignment')}</div><div className="nrs-mode-description">{t('colorDescription')}</div></div><div className="nrs-setting-actions"><ColorInput label={t('lightColor')} value={appearance.global.light} onChange={value => appearanceStore.setGlobal('light', value)} /><ColorInput label={t('darkColor')} value={appearance.global.dark} onChange={value => appearanceStore.setGlobal('dark', value)} /><SettingsMenu items={['allModels', 'eachModel']} selected={scope} onSelect={entry => appearanceStore.setScope(entry === 'eachModel' ? 'model' : 'global')} t={t} /></div></div>
  </>
}

export function apply(ctx) {
  const modelDirectories = ctx.get('modelDirectories')
  const sessions = ctx.get('sessions')
  if (modelDirectories === undefined || sessions === undefined) return
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = name; style.textContent = CSS; document.head.appendChild(style)
    return () => style.remove()
  }, `${name}: styles`)
  ctx.effect(() => ctx.locale.register(name, LOCALES), `${name}: dictionaries`)
  const t = ctx.locale.bind(name)
  ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({ name: SETTINGS_SLOT, id: 'native-reasoning-slider-mode', order: 17 }, () => <PluginSettings t={t} />))
  ctx.slots.inject(SLOT, () => {
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
