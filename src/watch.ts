import { effect, setActiveSub } from 'alien-signals'
import { hasChanged, isArray, isComputed, isFunction, isMap, isObject, isPlainObject, isSet, isSignal, NOOP } from './utils'
import { isDeepSignal, isShallow } from './deepSignal'
import { SignalFlags } from './contents'
import type { Computed, Signal } from './core'

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchEffect = (onCleanup: OnCleanup) => void

export type WatchSource<T = any> = Signal<T> | Computed<T> | (() => T)
export type WatchFlush = 'post' | 'sync'

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
  flush?: WatchFlush
  scheduler?: (job: () => void, isFirstRun: boolean) => void
}

export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: OnCleanup) => any
export interface WatchHandle {
  (): void
  pause: () => void
  resume: () => void
  stop: () => void
}

const INITIAL_WATCHER_VALUE = {}

export function watch(source: WatchSource | WatchSource[] | WatchEffect | object, cb?: WatchCallback, options: WatchOptions = {}) {
  const { once, immediate, deep, flush = 'pre', scheduler } = options

  let getter!: () => any
  let forceTrigger = false
  let isMultiSource = false
  let isFirstRun = true
  let isPaused = false
  let isStopped = false
  let isPending = false
  let pausedDirty = false
  let pausedValue: unknown
  let pendingNewValue: unknown
  let pendingOldValue: unknown
  const signalGetter = (source: object) => {
    // for `deep: false | 0` or shallow sources, only traverse root-level properties
    if (isShallow(source) || deep === false || deep === 0) return traverse(source, 1)
    // for `deep: undefined` on a deep signal object, deeply traverse all properties
    return traverse(source)
  }

  let stop: () => void = NOOP
  let stopAfterInitialRun = false
  let cleanupFns: (() => void)[] = []
  const runCleanup = () => {
    if (!cleanupFns.length) return
    const fns = cleanupFns
    cleanupFns = []
    const prevSub = setActiveSub()
    try {
      for (const fn of fns) fn()
    } finally {
      setActiveSub(prevSub)
    }
  }
  const onCleanup: OnCleanup = cleanupFn => {
    cleanupFns.push(cleanupFn)
  }
  const queueJob = (job: () => void) => {
    const firstRun = isFirstRun
    isFirstRun = false
    if (scheduler) {
      scheduler(job, firstRun)
    } else if (flush === 'post') {
      Promise.resolve().then(job)
    } else {
      job()
    }
  }
  const finishCallback = () => {
    isPending = false
    runCleanup()
    cb!(pendingNewValue, pendingOldValue, onCleanup)
    oldValue = pendingNewValue

    if (once) watchHandle()
  }
  const queueCallback = (newValue: unknown, oldValueForCallback: unknown) => {
    pendingNewValue = newValue
    if (isPending) return
    isPending = true
    pendingOldValue = oldValueForCallback
    queueJob(finishCallback)
  }
  const watchHandle = (() => {
    if (isStopped) return
    isStopped = true
    runCleanup()
    if (stop === NOOP) {
      stopAfterInitialRun = true
    } else {
      stop()
    }
  }) as WatchHandle
  watchHandle.stop = watchHandle
  watchHandle.pause = () => {
    if (isStopped || isPaused) return
    isPaused = true
    if (!cb) {
      runCleanup()
      stop()
    }
  }
  watchHandle.resume = () => {
    if (isStopped || !isPaused) return
    isPaused = false
    if (!cb) {
      stop = effect(job)
    } else if (pausedDirty) {
      pausedDirty = false
      const oldValueForCallback = oldValue === INITIAL_WATCHER_VALUE ? undefined : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue
      queueCallback(pausedValue, oldValueForCallback)
    }
  }

  if (isSignal(source) || isComputed(source)) {
    getter = () => source()
    forceTrigger = isShallow(source)
  } else if (isDeepSignal(source)) {
    getter = () => signalGetter(source)
    forceTrigger = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(s => isDeepSignal(s) || isShallow(s))
    getter = () =>
      source.map(s => {
        if (isSignal(s) || isComputed(s)) {
          return s()
        } else if (isDeepSignal(s)) {
          return signalGetter(s)
        } else if (isFunction(s)) {
          return s()
        }
      })
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = source as () => any
    } else {
      // no cb -> simple effect
      getter = () => {
        runCleanup()
        return source(onCleanup)
      }
    }
  } else {
    getter = NOOP
  }
  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  let oldValue: any = isMultiSource ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE) : INITIAL_WATCHER_VALUE

  let initialized = false
  const hasChangedValue = (newValue: unknown) => {
    return isMultiSource ? (newValue as any[]).some((value, index) => hasChanged(value, oldValue[index])) : hasChanged(newValue, oldValue)
  }

  const job = () => {
    if (isStopped) return

    if (!cb) {
      if (isPaused) return
      getter()
      return
    }

    const newValue = getter()

    if (!initialized) {
      initialized = true
      if (!immediate) {
        oldValue = newValue
        return
      }
    }

    if (!deep && !forceTrigger && !hasChangedValue(newValue)) {
      return
    }

    if (isPaused) {
      pausedDirty = true
      pausedValue = newValue
      return
    }

    const oldValueForCallback = oldValue === INITIAL_WATCHER_VALUE ? undefined : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue
    queueCallback(newValue, oldValueForCallback)
  }

  stop = effect(job)
  if (stopAfterInitialRun) stop()
  return watchHandle
}

export function traverse(value: unknown, depth: number = Infinity, seen?: Set<unknown>): unknown {
  if (depth <= 0 || !isObject(value) || (value as any)[SignalFlags.SKIP]) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  if (isSignal(value) || isComputed(value)) {
    traverse(value(), depth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, depth, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen)
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse(value[key as any], depth, seen)
      }
    }
  }
  return value
}
