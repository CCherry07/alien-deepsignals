import { describe, expect, it } from 'vitest'
import { deepSignal, watchEffect } from '..'

describe('watchEffect', () => {
  it('should run immediately and track dependencies', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    let value = 0

    watchEffect(() => {
      runs++
      value = store.count
    })

    expect(runs).toBe(1)
    expect(value).toBe(0)

    store.count = 1

    expect(runs).toBe(2)
    expect(value).toBe(1)
  })

  it('should update tracked dependencies after each run', () => {
    const store = deepSignal({
      enabled: true,
      a: 1,
      b: 2,
    })
    let runs = 0
    let value = 0

    watchEffect(() => {
      runs++
      value = store.enabled ? store.a : store.b
    })

    expect(runs).toBe(1)
    expect(value).toBe(1)

    store.b = 3

    expect(runs).toBe(1)
    expect(value).toBe(1)

    store.enabled = false

    expect(runs).toBe(2)
    expect(value).toBe(3)

    store.a = 4

    expect(runs).toBe(2)
    expect(value).toBe(3)

    store.b = 5

    expect(runs).toBe(3)
    expect(value).toBe(5)
  })

  it('should run cleanup before rerun and when stopped', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    let cleanups = 0
    const stop = watchEffect((onCleanup) => {
      runs++
      store.count
      onCleanup(() => {
        cleanups++
      })
    })

    expect(runs).toBe(1)
    expect(cleanups).toBe(0)

    store.count = 1

    expect(runs).toBe(2)
    expect(cleanups).toBe(1)

    stop()

    expect(cleanups).toBe(2)
  })

  it('should pause and resume tracking', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    let value = 0
    const handle = watchEffect(() => {
      runs++
      value = store.count
    })

    expect(runs).toBe(1)
    expect(value).toBe(0)

    handle.pause()
    store.count = 1

    expect(runs).toBe(1)
    expect(value).toBe(0)

    handle.resume()

    expect(runs).toBe(2)
    expect(value).toBe(1)
  })

  it('should stop future updates', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    let value = 0
    const stop = watchEffect(() => {
      runs++
      value = store.count
    })

    stop()
    store.count = 1

    expect(runs).toBe(1)
    expect(value).toBe(0)
  })
})
