import { describe, expect, it } from 'vitest'
import { deepSignal, shallow } from '../deepSignal'
import { traverse, watch } from '../watch'
import { watchEffect } from '../watchEffect'
import { computed, signal } from 'alien-signals'

describe('watch', () => {
  it('watch immediate', () => {
    const store = deepSignal({
      userinfo: {
        name: 'tom',
      },
    })
    let val!: string
    watch(
      store,
      newValue => {
        val = newValue.userinfo.name
      },
      {
        immediate: true,
        deep: true,
      },
    )
    expect(val).toEqual('tom')
  })
  it('watch deep', () => {
    const store = deepSignal({
      userinfo: {
        name: 'tom',
      },
    })
    let val!: string
    watch(
      store,
      newValue => {
        val = newValue.userinfo.name
      },
      {
        immediate: true,
        deep: true,
      },
    )
    let value2!: string
    watch(
      store,
      newValue => {
        value2 = newValue.userinfo.name
      },
      { immediate: true },
    )
    expect(val).toEqual('tom')
    store.userinfo.name = 'jon'
    expect(val).toEqual('jon')
    expect(value2).toEqual('jon')
  })

  it('watch cleanup', () => {
    const store = deepSignal({
      count: 0,
    })
    let cleanups = 0
    const stop = watch(
      () => store.count,
      (_newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanups++
        })
      },
      { immediate: true },
    )

    expect(cleanups).toEqual(0)
    store.count = 1
    expect(cleanups).toEqual(1)
    stop()
    expect(cleanups).toEqual(2)
  })

  it('watch multiple sources with getter functions', () => {
    const store = deepSignal({
      a: 1,
      b: 2,
    })
    let values: number[] = []
    watch(
      [() => store.a, store.$b!],
      newValue => {
        values = newValue
      },
      { immediate: true },
    )

    expect(values).toEqual([1, 2])
    store.a = 3
    expect(values).toEqual([3, 2])
    store.b = 4
    expect(values).toEqual([3, 4])
  })

  it('watch multiple sources with deep signal objects and ignored sources', () => {
    const store = deepSignal({
      nested: {
        count: 0,
      },
    })
    let values: unknown[] = []

    watch(
      [store, 1 as any],
      newValue => {
        values = newValue
      },
      { immediate: true },
    )

    expect(values[1]).toBeUndefined()

    store.nested.count = 1

    expect(values[0]).toBe(store)
  })

  it('watch once', () => {
    const store = deepSignal({
      userinfo: {
        name: 'tom',
      },
    })
    let val!: string
    watch(
      store,
      newValue => {
        val = newValue.userinfo.name
      },
      {
        immediate: true,
        deep: true,
        once: true,
      },
    )

    expect(val).toEqual('tom')
    store.userinfo.name = 'jon'
    expect(val).not.toEqual('jon')
    expect(val).toEqual('tom')
  })

  it('watch handle pause and resume', () => {
    const store = deepSignal({
      count: 0,
    })
    let val = 0
    const handle = watch(
      () => store.count,
      newValue => {
        val = newValue
      },
      { immediate: true },
    )

    expect(val).toEqual(0)
    handle.pause()
    store.count = 1
    store.count = 2
    expect(val).toEqual(0)
    handle.resume()
    expect(val).toEqual(2)
    store.count = 3
    expect(val).toEqual(3)
    handle.stop()
    store.count = 4
    expect(val).toEqual(3)
  })

  it('watch flush post', async () => {
    const store = deepSignal({
      count: 0,
    })
    let val = 0
    watch(
      () => store.count,
      newValue => {
        val = newValue
      },
      { flush: 'post' },
    )

    store.count = 1
    expect(val).toEqual(0)
    await Promise.resolve()
    expect(val).toEqual(1)
  })

  it('watch scheduler', () => {
    const store = deepSignal({
      count: 0,
    })
    const jobs: (() => void)[] = []
    let val = 0
    watch(
      () => store.count,
      newValue => {
        val = newValue
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    store.count = 1
    expect(val).toEqual(0)
    expect(jobs).toHaveLength(1)
    jobs.shift()!()
    expect(val).toEqual(1)
  })

  it('watch scheduler receives the first run flag', () => {
    const store = deepSignal({
      count: 0,
    })
    const firstRuns: boolean[] = []

    watch(
      () => store.count,
      () => {},
      {
        immediate: true,
        scheduler(job, isFirstRun) {
          firstRuns.push(isFirstRun)
          job()
        },
      },
    )

    store.count = 1

    expect(firstRuns).toEqual([true, false])
  })

  it('watch signal and computed sources', () => {
    const count = signal(1)
    const double = computed(() => count() * 2)
    let signalValue = 0
    let computedValue = 0

    watch(
      count,
      newValue => {
        signalValue = newValue
      },
      { immediate: true },
    )
    watch(
      double,
      newValue => {
        computedValue = newValue
      },
      { immediate: true },
    )

    expect(signalValue).toEqual(1)
    expect(computedValue).toEqual(2)

    count(2)

    expect(signalValue).toEqual(2)
    expect(computedValue).toEqual(4)
  })

  it('watch should skip unchanged values', () => {
    const store = deepSignal({
      count: 0,
      other: 0,
    })
    let runs = 0

    watch(
      () => store.count,
      () => {
        runs++
      },
    )

    store.other = 1
    expect(runs).toEqual(0)

    store.count = 1
    expect(runs).toEqual(1)
  })

  it('watch should skip callbacks when dependencies change without value changes', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0

    watch(
      () => {
        store.count
        return 'same'
      },
      () => {
        runs++
      },
    )

    store.count = 1

    expect(runs).toEqual(0)
  })

  it('watch should support queued callback coalescing', () => {
    const store = deepSignal({
      count: 0,
    })
    const jobs: (() => void)[] = []
    let value = 0

    watch(
      () => store.count,
      newValue => {
        value = newValue
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    store.count = 1
    store.count = 2

    expect(jobs).toHaveLength(1)
    jobs[0]()
    expect(value).toEqual(2)
  })

  it('watch handle methods should be idempotent', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    const handle = watch(
      () => store.count,
      () => {
        runs++
      },
    )

    handle.pause()
    handle.pause()
    store.count = 1
    handle.resume()
    handle.resume()
    expect(runs).toEqual(1)

    handle.stop()
    handle.stop()
    store.count = 2
    expect(runs).toEqual(1)
  })

  it('watch resume should ignore clean watchers', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0
    const handle = watch(
      () => store.count,
      () => {
        runs++
      },
    )

    handle.pause()
    handle.resume()

    expect(runs).toEqual(0)
  })

  it('watchEffect should ignore updates while paused', () => {
    const store = deepSignal({
      count: 0,
    })
    let value = 0
    const handle = watchEffect(() => {
      value = store.count
    })

    handle.pause()
    store.count = 1

    expect(value).toEqual(0)

    handle.stop()
    handle.resume()
    store.count = 2

    expect(value).toEqual(0)
  })

  it('watch should stop immediately for once immediate watchers', () => {
    const store = deepSignal({
      count: 0,
    })
    let runs = 0

    watch(
      () => store.count,
      () => {
        runs++
      },
      {
        immediate: true,
        once: true,
      },
    )

    store.count = 1

    expect(runs).toEqual(1)
  })

  it('watch should stop once watchers after scheduled callback flushes', () => {
    const store = deepSignal({
      count: 0,
    })
    const jobs: (() => void)[] = []
    let runs = 0

    watch(
      () => store.count,
      () => {
        runs++
      },
      {
        once: true,
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    store.count = 1
    jobs.shift()!()
    store.count = 2

    expect(runs).toEqual(1)
  })

  it('watch should ignore queued jobs after stop', () => {
    const store = deepSignal({
      count: 0,
    })
    const jobs: (() => void)[] = []
    let runs = 0
    const stop = watch(
      () => store.count,
      () => {
        runs++
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    store.count = 1
    stop()
    jobs.shift()!()

    expect(runs).toEqual(0)
  })

  it('watch should handle invalid sources as noop', () => {
    let runs = 0

    watch(
      1 as any,
      () => {
        runs++
      },
      { immediate: true },
    )

    expect(runs).toEqual(1)
  })

  it('watch should support false and numeric deep options', () => {
    const store = deepSignal({
      nested: {
        count: 0,
      },
    })
    let falseDeepRuns = 0
    let numericDeepRuns = 0

    watch(
      store,
      () => {
        falseDeepRuns++
      },
      { deep: false },
    )
    watch(
      () => store.nested,
      () => {
        numericDeepRuns++
      },
      { deep: 1 },
    )

    store.nested.count = 1

    expect(falseDeepRuns).toEqual(0)
    expect(numericDeepRuns).toEqual(1)
  })

  it('watch should deeply traverse deep signal objects by default', () => {
    const store = deepSignal({
      nested: {
        count: 0,
      },
    })
    let runs = 0

    watch(store, () => {
      runs++
    })

    store.nested.count = 1

    expect(runs).toEqual(1)
  })

  it('watch should traverse shallow and depth limited sources', () => {
    const store = deepSignal({
      root: shallow({
        count: 0,
      }),
      nested: {
        count: 0,
      },
    })
    let shallowRuns = 0
    let depthRuns = 0

    watch(store.root, () => {
      shallowRuns++
    })
    watch(
      store,
      () => {
        depthRuns++
      },
      { deep: 0 },
    )

    store.root.count = 1
    store.nested.count = 1

    expect(shallowRuns).toEqual(1)
    expect(depthRuns).toEqual(0)

    store.nested = { count: 2 }

    expect(depthRuns).toEqual(1)
  })

  it('traverse should handle signals, arrays, maps, sets, symbols, and cycles', () => {
    const count = signal(1)
    const doubled = computed(() => count() * 2)
    const key = Symbol('key')
    const value: any = {
      count,
      doubled,
      array: [count],
      map: new Map([['count', count]]),
      set: new Set([doubled]),
      [key]: count,
    }
    value.self = value

    expect(traverse(value)).toBe(value)
    expect(traverse(value, 0)).toBe(value)
    expect(traverse(new Date())).toBeInstanceOf(Date)

    const hidden = Symbol('hidden')
    const objectWithHiddenSymbol = {}
    Object.defineProperty(objectWithHiddenSymbol, hidden, {
      enumerable: false,
      value: count,
    })
    expect(traverse(objectWithHiddenSymbol)).toBe(objectWithHiddenSymbol)
  })

  it('traverse should return already seen objects', () => {
    const value = {}
    const seen = new Set<unknown>([value])

    expect(traverse(value, Infinity, seen)).toBe(value)
  })

  it('watch effect', () => {
    const store = deepSignal({
      userinfo: {
        name: 'tom',
      },
    })
    let x = undefined
    watchEffect(() => {
      x = store.userinfo.name
    })

    expect(x).toEqual('tom')
    store.userinfo.name = 'jon'
    expect(x).toEqual('jon')
  })

  it('watch effect cleanup', () => {
    const store = deepSignal({
      count: 0,
    })
    let cleanups = 0
    const stop = watchEffect(onCleanup => {
      store.count
      onCleanup(() => {
        cleanups++
      })
    })

    expect(cleanups).toEqual(0)
    store.count = 1
    expect(cleanups).toEqual(1)
    stop()
    expect(cleanups).toEqual(2)
  })

  it('watch effect handle pause and resume', () => {
    const store = deepSignal({
      count: 0,
    })
    let val = 0
    const handle = watchEffect(() => {
      val = store.count
    })

    expect(val).toEqual(0)
    handle.pause()
    store.count = 1
    expect(val).toEqual(0)
    handle.resume()
    expect(val).toEqual(1)
    store.count = 2
    expect(val).toEqual(2)
  })
})
