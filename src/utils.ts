import { SignalFlags } from "./contents"
import { Computed, Signal } from "./core"

export const objectToString: typeof Object.prototype.toString =
  Object.prototype.toString
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)
const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol,
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const isArray: typeof Array.isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

export const isDate = (val: unknown): val is Date =>
  toTypeString(val) === '[object Date]'
export const isRegExp = (val: unknown): val is RegExp =>
  toTypeString(val) === '[object RegExp]'
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return (
    (isObject(val) || isFunction(val)) &&
    isFunction((val as any).then) &&
    isFunction((val as any).catch)
  )
}
export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

export function NOOP() {}

export function isSignal<T>(r: Signal<T> | unknown): r is Signal<T>
export function isSignal(r: any): r is Signal {
  return r ? r[SignalFlags.IS_SIGNAL] === true : false
}

export function isComputed<T>(r: Computed<T> | unknown): r is Computed<T>
export function isComputed<T>(r: any): r is Computed<T> {
  return r ? r[SignalFlags.IS_COMPUTED] === true : false
}

export type MaybeSignal<T = any> =
  | T
  | Signal<T>

export type MaybeSignalOrGetter<T = any> = MaybeSignal<T> | Computed<T> | (() => T)

export function unSignal<T>(signal: MaybeSignal<T> | Computed<T>): T {
  return (isSignal(signal) || isComputed(signal) ? signal.value : signal) as T;
}

export function toValue<T>(source: MaybeSignalOrGetter<T>): T {
  return isFunction(source) ? source() : unSignal(source)
}
