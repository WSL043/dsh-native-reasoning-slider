import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  IconCheckOutline16,
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconWarningOutline16,
  Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { advertisedEfforts, normalizeMode, shouldAnimate, snapEffort } from './policy.js'
import { CSS } from './styles.js'

export const name = 'dsh-native-reasoning-slider'
export const inject = ['slots', 'locale', 'modelDirectories', 'sessions']

const SLOT = 'conversation.input.model'
const SETTINGS_SLOT = 'settings.general.item'
const STORAGE_KEY = 'dsh-native-reasoning-slider.mode'
const listeners = new Set()

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

const LOCALES = {
  en: {
    settingTitle: 'Reasoning control', settingDescription: 'Use the official menu, a quiet native slider, or transient energy effects.',
    official: 'Official', native: 'Native', energy: 'Energy', model: 'Model', effort: 'Effort', retry: 'Retry',
    loading: 'Loading models…', noModels: 'No available models.', noEfforts: 'This model does not expose reasoning effort levels.',
    selectionFailed: 'The setting was not saved. {message}', groupFailed: '{name}: {message}', selectModel: 'Select model',
  },
  zh: {
    settingTitle: '推理强度控制', settingDescription: '可切换官方菜单、安静的原生滑块或短暂能量特效。',
    official: '官方', native: '原生', energy: '能量', model: '模型', effort: '推理强度', retry: '重试',
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

function EnergyCanvas({ progress, active, mode }) {
  const canvasRef = useRef(null)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null || !shouldAnimate({ mode, reducedMotion, active })) return undefined
    const context = canvas.getContext('2d')
    if (context === null) return undefined
    let frame = 0
    let stopped = false
    let last = 0
    const started = performance.now()
    const render = now => {
      if (stopped) return
      frame = requestAnimationFrame(render)
      if (now - last < 32) return
      last = now
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      context.clearRect(0, 0, width, height)
      const x = (Math.max(0, Math.min(100, progress)) / 100) * width
      const color = getComputedStyle(canvas).color
      context.globalCompositeOperation = 'lighter'
      const glow = context.createRadialGradient(x, height / 2, 0, x, height / 2, height * 1.25)
      glow.addColorStop(0, color)
      glow.addColorStop(1, 'transparent')
      context.globalAlpha = .18 + progress / 310
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)
      const elapsed = (now - started) / 1000
      const count = 8 + Math.round(progress / 5)
      context.fillStyle = color
      for (let index = 0; index < count; index += 1) {
        const seed = (index * 47.17) % 101
        const travel = (elapsed * (18 + progress * .28) + seed) % 100
        const px = x - (travel / 100) * Math.max(x, width * .16)
        const py = height / 2 + Math.sin(index * 2.73 + elapsed * 4.2) * height * (.08 + progress / 900)
        const radius = ratio * (.65 + ((index * 13) % 7) / 8)
        context.globalAlpha = Math.max(0, .16 + progress / 180 - travel / 135)
        context.beginPath(); context.arc(px, py, radius, 0, Math.PI * 2); context.fill()
      }
      context.globalCompositeOperation = 'source-over'
    }
    frame = requestAnimationFrame(render)
    return () => { stopped = true; cancelAnimationFrame(frame); context.clearRect(0, 0, canvas.width, canvas.height) }
  }, [active, mode, progress, reducedMotion])
  return <canvas ref={canvasRef} className="nrs-energy" aria-hidden="true" />
}

function EffortSlider({ current, reasoning, select, busy, mode, onFailure, t }) {
  const efforts = advertisedEfforts(reasoning)
  const effective = current?.reasoningEffort ?? reasoning?.defaultEffort
  const currentIndex = Math.max(0, efforts.findIndex(entry => entry.id === effective))
  const committed = efforts.length < 2 ? 0 : (currentIndex / (efforts.length - 1)) * 100
  const [preview, setPreview] = useState(committed)
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)
  const committing = useRef(false)
  useEffect(() => { if (!dragging && !committing.current) setPreview(committed) }, [committed, dragging])
  useEffect(() => () => { committing.current = false }, [])

  if (current === null || efforts.length < 2) return <div className="nrs-empty">{t('noEfforts')}</div>
  const snapped = snapEffort(efforts, preview)
  const active = dragging || settling
  const previewOnly = event => setPreview(Number(event.currentTarget.value))
  const commitAt = async position => {
    setDragging(false)
    if (committing.current) return
    const effort = snapEffort(efforts, position)
    if (effort === undefined) return
    const nextPosition = (efforts.findIndex(entry => entry.id === effort.id) / (efforts.length - 1)) * 100
    setPreview(nextPosition)
    if (effort.id === effective) return
    committing.current = true
    setSettling(true)
    const accepted = await select({ provider: current.provider, model: current.model, reasoningEffort: effort.id })
    committing.current = false
    window.setTimeout(() => setSettling(false), 620)
    if (!accepted) { setPreview(committed); onFailure() }
  }
  const commitPreview = () => commitAt(preview)
  const choose = async effort => {
    const index = efforts.findIndex(entry => entry.id === effort.id)
    const position = (index / (efforts.length - 1)) * 100
    setPreview(position)
    await commitAt(position)
  }
  const currentLabel = snapped?.name ?? effective ?? ''
  return (
    <section className={`nrs-effort ${mode === 'energy' ? 'is-energy' : ''} ${active ? 'is-active' : ''} ${preview >= 99 ? 'is-max' : ''}`} style={{ '--nrs-progress': `${preview}%` }}>
      <div className="nrs-effort-head"><span className="nrs-effort-title">{t('effort')}</span><span className="nrs-effort-current">{currentLabel}</span></div>
      <div className="nrs-levels">
        {efforts.map(entry => <button type="button" className={`nrs-level ${snapped?.id === entry.id ? 'is-current' : ''}`} key={entry.id} disabled={busy} onClick={() => { void choose(entry) }}>{entry.name}</button>)}
      </div>
      <div className="nrs-track-wrap">
        <div className="nrs-track-fill" aria-hidden="true" />
        {mode === 'energy' ? <EnergyCanvas progress={preview} active={active} mode={mode} /> : null}
        <input
          className="nrs-range" type="range" min="0" max="100" step="0.1" value={preview} disabled={busy}
          aria-label={t('effort')} aria-valuetext={currentLabel}
          onInput={previewOnly}
          onPointerDown={() => setDragging(true)}
          onPointerUp={commitPreview}
          onPointerCancel={() => { setDragging(false); setPreview(committed) }}
          onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) void commitPreview() }}
          onBlur={() => { if (dragging) void commitPreview() }}
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
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState('root')
  const [toast, setToast] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])
  const id = useId()
  useEffect(() => { if (available) load() }, [available, load])
  useEffect(() => {
    if (!open) return undefined
    const closeOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
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
    setOpen(false)
    setPane('root')
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus())
  }
  const moveFocus = offset => {
    const items = itemRefs.current.filter(Boolean)
    if (items.length === 0) return
    const active = items.findIndex(item => item === document.activeElement)
    const next = (Math.max(active, 0) + offset + items.length) % items.length
    items[next]?.focus()
  }
  const onRootKeyDown = event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      if (pane !== 'root') setPane('root')
      else close(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
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
  return (
    <div ref={rootRef} className="nrs-root" onKeyDown={onRootKeyDown} onBlur={onBlur}>
      <button ref={triggerRef} type="button" className="nrs-trigger" disabled={locked} aria-label={[modelLabel, effortLabel].filter(Boolean).join(' · ')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `${id}-menu` : undefined} onClick={() => { if (open) close(); else { setOpen(true); load() } }}>
        <span className="nrs-trigger-model">{modelLabel}</span>{effortLabel ? <span className="nrs-trigger-effort">{effortLabel}</span> : null}<IconChevronDownOutline14 className={`nrs-chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open ? <div id={`${id}-menu`} className="nrs-menu" role="menu" aria-busy={state.status === 'loading' || busy}>
        {pane === 'root' ? <>
          <button ref={itemRef()} type="button" role="menuitem" className="nrs-cell" onClick={() => setPane('models')}><span className="nrs-cell-label">{t('model')}</span><span className="nrs-cell-value">{modelLabel}</span><IconChevronRightOutline14 className="nrs-cell-chevron" /></button>
          <EffortSlider current={state.current} reasoning={reasoning} select={select} busy={busy} mode={mode} onFailure={failure} t={t} />
        </> : <>
          {state.status === 'loading' ? <div className="nrs-status">{t('loading')}</div> : null}
          {state.error !== null ? <div className="nrs-error"><span>{state.error}</span><button type="button" className="nrs-retry" onClick={load}>{t('retry')}</button></div> : null}
          {state.failures.map(failure => <div className="nrs-error" key={failure.id}><span>{t('groupFailed', { name: failure.name, message: failure.message })}</span><button type="button" className="nrs-retry" onClick={load}>{t('retry')}</button></div>)}
          <div className="nrs-models scrollable">{state.groups.map(group => <section className="nrs-group" role="group" key={group.id}><div className="nrs-group-title">{group.name}</div>{group.models.map(model => {
            const selected = state.current?.provider === group.id && state.current.model === model.id
            return <button ref={itemRef()} type="button" role="menuitemradio" aria-checked={selected} className="nrs-option" key={model.id} disabled={busy} onClick={() => { void chooseModel(group, model) }}><span className="nrs-option-copy"><span className="nrs-option-name">{model.name}</span>{model.description ? <span className="nrs-option-description">{model.description}</span> : null}</span><span className="nrs-check">{selected ? <IconCheckOutline16 /> : null}</span></button>
          })}</section>)}</div>
          {state.status === 'ready' && choices.length === 0 ? <div className="nrs-empty">{t('noModels')}</div> : null}
        </>}
      </div> : null}
      {toast ? <Toast key={toast.id} text={toast.text} icon={<IconWarningOutline16 />} anchor={rootRef.current?.closest('[data-composer-card]') ?? null} onDone={() => setToast(null)} /> : null}
    </div>
  )
}

function ModeSetting({ t }) {
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.getSnapshot)
  return <div className="nrs-mode-row"><div className="nrs-mode-copy"><div className="nrs-mode-title">{t('settingTitle')}</div><div className="nrs-mode-description">{t('settingDescription')}</div></div><div className="nrs-mode-control" role="radiogroup" aria-label={t('settingTitle')}>{['official', 'native', 'energy'].map(entry => <button type="button" role="radio" aria-checked={mode === entry} className={`nrs-mode-button ${mode === entry ? 'is-selected' : ''}`} key={entry} onClick={() => modeStore.set(entry)}>{t(entry)}</button>)}</div></div>
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
  ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({ name: SETTINGS_SLOT, id: 'native-reasoning-slider-mode', order: 17 }, () => <ModeSetting t={t} />))
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
    const syncStorage = event => { if (event.key === STORAGE_KEY) modeStore.set(event.newValue, false) }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, `${name}: preference sync`)
}
