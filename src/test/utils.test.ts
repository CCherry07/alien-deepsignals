import { describe, expect, it } from 'vitest'
import { computed, effect, signal } from '..'
import { hasOwn, hasChanged, isArray, isComputed, isFunction, isMap, isObject, isPlainObject, isSet, isSignal, NOOP, objectToString, peekSignal, toTypeString, toValue, unSignal } from '../utils'

describe('utils', () => {
  it('should identify object type strings', () => {
    expect(objectToString.call([])).toBe('[object Array]')
    expect(toTypeString({})).toBe('[object Object]')
    expect(toTypeString([])).toBe('[object Array]')
    expect(toTypeString(new Map())).toBe('[object Map]')
    expect(toTypeString(new Set())).toBe('[object Set]')
  })

  it('should check own properties', () => {
    const inherited = { inherited: true }
    const obj = Object.create(inherited) as { own: boolean; inherited: boolean }
    obj.own = true

    expect(hasOwn(obj, 'own')).toBe(true)
    expect(hasOwn(obj, 'inherited')).toBe(false)
  })

  it('should identify built-in data types', () => {
    expect(isArray([])).toBe(true)
    expect(isArray({})).toBe(false)
    expect(isMap(new Map())).toBe(true)
    expect(isMap({})).toBe(false)
    expect(isSet(new Set())).toBe(true)
    expect(isSet({})).toBe(false)
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(1)).toBe(false)
    expect(isObject({})).toBe(true)
    expect(isObject(null)).toBe(false)
    expect(isObject(() => {})).toBe(false)
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
  })

  it('should compare changes with Object.is semantics', () => {
    expect(hasChanged(1, 1)).toBe(false)
    expect(hasChanged(1, 2)).toBe(true)
    expect(hasChanged(Number.NaN, Number.NaN)).toBe(false)
    expect(hasChanged(0, -0)).toBe(true)
  })

  it('should expose a noop helper', () => {
    expect(NOOP()).toBeUndefined()
  })

  it('should identify signals and computed values', () => {
    const value = signal(1)
    const doubled = computed(() => value() * 2)

    expect(isSignal(value)).toBe(true)
    expect(isSignal(doubled)).toBe(false)
    expect(isSignal(1)).toBe(false)
    expect(isComputed(doubled)).toBe(true)
    expect(isComputed(value)).toBe(false)
    expect(isComputed(1)).toBe(false)
  })

  it('should unwrap signals and computed values', () => {
    const value = signal(1)
    const doubled = computed(() => value() * 2)

    expect(unSignal(value)).toBe(1)
    expect(unSignal(doubled)).toBe(2)
    expect(unSignal(3)).toBe(3)
  })

  it('should resolve values, signals, computed values, and getters', () => {
    const value = signal(1)
    const doubled = computed(() => value() * 2)

    expect(toValue(value)).toBe(1)
    expect(toValue(doubled)).toBe(2)
    expect(toValue(3)).toBe(3)
    expect(toValue(() => 4)).toBe(4)
  })

  it('should peek signal values without tracking dependencies', () => {
    const value = signal(1)
    let runs = 0
    let current = 0

    effect(() => {
      runs++
      current = peekSignal(value)
    })

    expect(runs).toBe(1)
    expect(current).toBe(1)

    value(2)

    expect(runs).toBe(1)
    expect(current).toBe(1)
  })
})
