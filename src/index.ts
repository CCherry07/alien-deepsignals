export { effectScope, isEffectScope, isEffect } from "alien-signals"
export * from "./core";
export * from "./deepSignal";
export * from "./watch"
export * from "./watchEffect"
export {
  isArray,
  isFunction,
  isMap,
  isObject,
  isPlainObject,
  isSet,
  isSignal,
  isComputed,
  unSignal,
  toValue,
} from "./utils"
export type { MaybeSignal, MaybeSignalOrGetter } from "./utils"
