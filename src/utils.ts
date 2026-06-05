import { isComputed as isAlienComputed, isSignal as isAlienSignal } from 'alien-signals'
import type { Computed, Signal } from './core'

export const objectToString: typeof Object.prototype.toString = Object.prototype.toString
export const toTypeString = (value: unknown): string => objectToString.call(value)

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val => hasOwnProperty.call(val, key)

export const isArray: typeof Array.isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> => toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> => toTypeString(val) === '[object Set]'

export const isFunction = (val: unknown): val is Function => typeof val === 'function'
export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'
export const isPlainObject = (val: unknown): val is Record<PropertyKey, unknown> => toTypeString(val) === '[object Object]'

export const hasChanged = (value: unknown, oldValue: unknown): boolean => !Object.is(value, oldValue)
export const NOOP = () => {}

export const isSignal = <T = any>(source: unknown): source is Signal<T> => {
  return typeof source === 'function' && isAlienSignal(source as () => void)
}

export const isComputed = <T = any>(source: unknown): source is Computed<T> => {
  return typeof source === 'function' && isAlienComputed(source as () => void)
}

export type MaybeSignal<T = any> = T | Signal<T>
export type MaybeSignalOrGetter<T = any> = MaybeSignal<T> | Computed<T> | (() => T)

export function unSignal<T>(source: MaybeSignal<T> | Computed<T>): T {
  return (isSignal(source) || isComputed(source) ? source() : source) as T
}

export function toValue<T>(source: MaybeSignalOrGetter<T>): T {
  if (isSignal(source) || isComputed(source)) return source()
  if (isFunction(source)) return (source as () => T)()
  return source as T
}
