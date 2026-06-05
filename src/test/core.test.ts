import { describe, it, expect } from 'vitest'
import { signal, effect, computed, batch } from '..'

describe('core', () => {
  it('basic signal', () => {
    const a = signal(1)
    expect(a()).toBe(1)
    a(2)
    expect(a()).toBe(2)
  })

  it('computed', () => {
    const a = signal(1)
    const b = computed(() => a() + 1)
    expect(b()).toBe(2)
    a(2)
    expect(b()).toBe(3)
  })

  it('effect', () => {
    const a = signal(1)
    let dummy
    effect(() => {
      dummy = a()
    })
    expect(dummy).toBe(1)
    a(2)
    expect(dummy).toBe(2)
  })

  it('nested computed', () => {
    const a = signal(1)
    const b = computed(() => a() + 1)
    const c = computed(() => b() + 1)
    expect(c()).toBe(3)
    a(2)
    expect(c()).toBe(4)
  })

  it('nested effect', () => {
    const a = signal(1)
    const b = signal(2)
    let dummy
    effect(() => {
      dummy = a() + b()
    })
    expect(dummy).toBe(3)
    a(2)
    expect(dummy).toBe(4)
    b(3)
    expect(dummy).toBe(5)
  })

  it('computed in effect', () => {
    const a = signal(1)
    const b = computed(() => a() + 1)
    let dummy
    effect(() => {
      dummy = b()
    })
    expect(dummy).toBe(2)
    a(2)
    expect(dummy).toBe(3)
  })

  it('effect in effect', () => {
    const a = signal(1)
    const b = signal(2)
    let dummy
    effect(() => {
      effect(() => {
        dummy = a() + b()
      })
    })
    expect(dummy).toBe(3)
    a(2)
    expect(dummy).toBe(4)
    b(3)
    expect(dummy).toBe(5)
  })

  it('computed in computed', () => {
    const a = signal(1)
    const b = computed(() => a() + 1)
    const c = computed(() => b() + 1)
    expect(c()).toBe(3)
    a(2)
    expect(c()).toBe(4)
  })

  it('batch updates', () => {
    const a = signal(1)
    const b = signal(2)
    let dummy = undefined as unknown as number
    effect(() => {
      dummy = a() + b()
    })
    expect(dummy).toBe(3)
    batch(() => {
      a(2)
      b(3)
      expect(dummy).toBe(3)
    })
    expect(dummy).toBe(5)
  })

  // it('unSignal', () => {
  //   const a = signal(1)
  //   expect(unSignal(a)).toBe(1)
  // })

  // it('isSignal', () => {
  //   const a = signal(1)
  //   const b = computed(() => a())
  //   expect(isSignal(a)).toBe(true)
  //   expect(isSignal(1)).toBe(false)
  //   expect(isSignal(b)).toBe(false)
  // })

  // it('toValue', () => {
  //   const a = signal(1)
  //   expect(toValue(a)).toBe(1)
  //   expect(toValue(2)).toBe(2)
  //   expect(toValue(() => 3)).toBe(3)
  //   const b = computed(() => a() + 1)
  //   expect(toValue(b)).toBe(2)
  // })

  it('peek', () => {
    const a = signal(1)
    expect(a()).toBe(1)
    a(2)
    expect(a()).toBe(2)
  })
})
