import { Computed, Effect, Signal } from './core';
import { hasChanged, isArray, isFunction, isMap, isObject, isPlainObject, isSet, isSignal, NOOP } from './utils';
import { isDeepSignal, isShallow } from "./deepSignal"
import { SignalFlags } from './contents';

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchEffect = (onCleanup: OnCleanup) => void

export type WatchSource<T = any> = Signal<T> | Computed<T> | (() => T)

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
}

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup,
) => any

const INITIAL_WATCHER_VALUE = {}
let activeWatcher!: Effect

// const resetTrackingStack: (Subscriber | undefined)[] = []

// export let activeSub: Subscriber | undefined = undefined

// export function setActiveSub(sub: Subscriber | undefined): void {
//   activeSub = sub
// }
// /**
//  * Temporarily pauses tracking.
//  */
// export function pauseTracking(): void {
//   resetTrackingStack.push(activeSub)
//   activeSub = undefined
// }

// /**
//  * Resets the previous global effect tracking state.
//  */
// export function resetTracking(): void {
//   if (process.env.NODE_ENV !== 'production'
//     && resetTrackingStack.length === 0) {
//     console.warn(
//       `resetTracking() was called when there was no active tracking ` +
//       `to reset.`,
//     )
//   }
//   if (resetTrackingStack.length) {
//     activeSub = resetTrackingStack.pop()!
//   } else {
//     activeSub = undefined
//   }
// }

export const remove = <T>(arr: T[], el: T): void => {
  const i = arr.indexOf(el)
  if (i > -1) {
    arr.splice(i, 1)
  }
}

export function watch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb?: WatchCallback,
  options: WatchOptions = {}
) {
  const { once, immediate, deep } = options

  let effect!: Effect
  let getter!: () => any
  let forceTrigger = false
  let isMultiSource = false
  // let cleanup = NOOP
  const signalGetter = (source: object) => {
    // traverse will happen in wrapped getter below
    if (deep) return source
    // for `deep: false | 0` or shallow reactive, only traverse root-level properties
    if (isShallow(source) || deep === false || deep === 0)
      return traverse(source, 1)
    // for `deep: undefined` on a reactive object, deeply traverse all properties
    return traverse(source)
  }

  const watchHandle = () => {
    effect.stop()
    return effect
  }

  if (once && cb) {
    const _cb = cb
    cb = (...args) => {
      _cb(...args)
      watchHandle()
    }
  }

  if (isSignal(source)) {
    getter = () => source.value
    forceTrigger = isShallow(source)
  } else if (isDeepSignal(source)) {
    getter = () => signalGetter(source)
    forceTrigger = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(s => isDeepSignal(s) || isShallow(s))
    getter = () =>
      source.map(s => {
        if (isSignal(s)) {
          return s.value
        } else if (isDeepSignal(s)) {
          return signalGetter(s)
        }
      })
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = (source as () => any)
    } else {
      // no cb -> simple effect
      getter = () => {
        // if (cleanup) {
        //   pauseTracking()
        //   try {
        //     cleanup()
        //   } finally {
        //     resetTracking()
        //   }
        // }
        const currentEffect = activeWatcher
        activeWatcher = effect
        try {
          return source(effect.stop)
        } finally {
          activeWatcher = currentEffect
        }
      }
    }
  } else {
    getter = NOOP
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Invalid watch source. Source must be a signal, a computed value !',
      )
    }
  }
  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE

  const job = (immediateFirstRun?: boolean) => {
    if ((!immediateFirstRun && !effect.shouldUpdate)) {
      return
    }
    if (cb) {
      const newValue = effect.run()

      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue))
      ) {
        const currentWatcher = activeWatcher
        activeWatcher = effect
        try {
          const args = [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE
              ? undefined
              : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
                ? []
                : oldValue,
            effect.stop,
          ]
          // @ts-ignore
          cb!(...args)
          oldValue = newValue
        } finally {
          activeWatcher = currentWatcher
        }
      }
    } else {
      // watchEffect
      effect.run()
    }
  }

  effect = new Effect(getter)
  effect.scheduler = job

  if (cb) {
    if (immediate) {
      job(true)
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }
  return watchHandle
}

export function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>,
): unknown {
  if (depth <= 0 || !isObject(value) || (value as any)[SignalFlags.SKIP]) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  if (isSignal(value)) {
    traverse(value.value, depth, seen)
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
