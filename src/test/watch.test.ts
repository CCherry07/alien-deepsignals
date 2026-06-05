import { describe, expect, it } from "vitest";
import { deepSignal } from "../deepSignal";
import { watch } from "../watch";
import { watchEffect } from "../watchEffect";

describe('watch', () => {
  it('watch immediate', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true
    })
    expect(val).toEqual('tom')
  })
  it('watch deep', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true
    })
    let value2!: string
    watch(store, (newValue) => {
      value2 = newValue.userinfo.name
    }, { immediate: true })
    expect(val).toEqual('tom')
    store.userinfo.name = "jon"
    expect(val).toEqual('jon')
    expect(value2).toEqual('jon')
  })

  it('watch cleanup', () => {
    const store = deepSignal({
      count: 0
    })
    let cleanups = 0
    const stop = watch(() => store.count, (_newValue, _oldValue, onCleanup) => {
      onCleanup(() => {
        cleanups++
      })
    }, { immediate: true })

    expect(cleanups).toEqual(0)
    store.count = 1
    expect(cleanups).toEqual(1)
    stop()
    expect(cleanups).toEqual(2)
  })

  it('watch multiple sources with getter functions', () => {
    const store = deepSignal({
      a: 1,
      b: 2
    })
    let values: number[] = []
    watch([() => store.a, store.$b!], (newValue) => {
      values = newValue
    }, { immediate: true })

    expect(values).toEqual([1, 2])
    store.a = 3
    expect(values).toEqual([3, 2])
    store.b = 4
    expect(values).toEqual([3, 4])
  })

  it('watch once', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true,
      once: true
    })

    expect(val).toEqual("tom")
    store.userinfo.name = "jon"
    expect(val).not.toEqual("jon")
    expect(val).toEqual("tom")
  })

  it('watch handle pause and resume', () => {
    const store = deepSignal({
      count: 0
    })
    let val = 0
    const handle = watch(() => store.count, (newValue) => {
      val = newValue
    }, { immediate: true })

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
      count: 0
    })
    let val = 0
    watch(() => store.count, (newValue) => {
      val = newValue
    }, { flush: 'post' })

    store.count = 1
    expect(val).toEqual(0)
    await Promise.resolve()
    expect(val).toEqual(1)
  })

  it('watch scheduler', () => {
    const store = deepSignal({
      count: 0
    })
    const jobs: (() => void)[] = []
    let val = 0
    watch(() => store.count, (newValue) => {
      val = newValue
    }, {
      scheduler(job) {
        jobs.push(job)
      }
    })

    store.count = 1
    expect(val).toEqual(0)
    expect(jobs).toHaveLength(1)
    jobs.shift()!()
    expect(val).toEqual(1)
  })

  it('watch effect', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let x = undefined
    watchEffect(() => {
      x = store.userinfo.name
    })

    expect(x).toEqual("tom")
    store.userinfo.name = "jon"
    expect(x).toEqual("jon")
  })

  it('watch effect cleanup', () => {
    const store = deepSignal({
      count: 0
    })
    let cleanups = 0
    const stop = watchEffect((onCleanup) => {
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
      count: 0
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
