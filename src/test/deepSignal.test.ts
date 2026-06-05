import { computed, deepSignal, isSignal, markRaw, peek, raw, RevertDeepSignal, shallow, signal, effect } from '..'
import { describe, it, expect, beforeEach } from 'vitest'
type Store = {
  a?: number
  nested: { b?: number }
  array: (number | Store['nested'])[]
}

describe('deepsignal/core', () => {
  let nested = { b: 2 }
  let array = [3, nested]
  let state: Store = { a: 1, nested, array }
  let store = deepSignal(state)

  const window = globalThis as any

  beforeEach(() => {
    nested = { b: 2 }
    array = [3, nested]
    state = { a: 1, nested, array }
    store = deepSignal(state)
  })

  describe('get - plain', () => {
    it('should return plain objects/arrays', () => {
      expect(store.nested).to.deep.equal({ b: 2 })
      expect(store.array).to.deep.equal([3, { b: 2 }])
      expect(store.array[1]).to.deep.equal({ b: 2 })
    })

    it('should return plain primitives', () => {
      expect(store.a).to.equal(1)
      expect(store.nested.b).to.equal(2)
      expect(store.array[0]).to.equal(3)
      expect(typeof store.array[1] === 'object' && store.array[1].b).to.equal(2)
      expect(store.array.length).to.equal(2)
    })

    it('should support reading from getters', () => {
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
      })
      expect(store.double).to.equal(2)
      store.counter = 2
      expect(store.double).to.equal(4)
    })

    it('should support getters returning other parts of the state', () => {
      const store = deepSignal({
        switch: 'a',
        a: { data: 'a' },
        b: { data: 'b' },
        get aOrB() {
          return store.switch === 'a' ? store.a : store.b
        },
      })
      expect(store.aOrB.data).to.equal('a')
      store.switch = 'b'
      expect(store.aOrB.data).to.equal('b')
    })

    it('should support getters using ownKeys traps', () => {
      const state = deepSignal({
        x: {
          a: 1,
          b: 2,
        },
        get y() {
          return Object.values(state.x)
        },
      })

      expect(state.y).to.deep.equal([1, 2])
    })

    it('should work with normal functions', () => {
      const store = deepSignal({
        value: 1,
        isBigger: (newValue: number): boolean => store.value < newValue,
        sum(newValue: number): number {
          return store.value + newValue
        },
        replace: (newValue: number): void => {
          store.value = newValue
        },
      })
      expect(store.isBigger(2)).to.equal(true)
      expect(store.sum(2)).to.equal(3)
      expect(store.value).to.equal(1)
      store.replace(2)
      expect(store.value).to.equal(2)
    })
  })

  describe('get - signals ($)', () => {
    it('should return signal when using store.$prop', () => {
      expect(isSignal(store.$a)).to.equal(true)
      expect(store.$a!()).to.equal(1)
      expect(isSignal(store.$nested)).to.equal(true)
      expect(store.$nested!().b).to.equal(2)
      expect(isSignal(store.nested.$b)).to.equal(true)
      expect(store.nested.$b!()).to.equal(2)
    })

    it('should return signal when accessing array.$[index] in arrays', () => {
      expect(isSignal(store.$array)).to.equal(true)
      expect(store.$array!()[0]).to.equal(3)
      expect(isSignal(store.array.$![0])).to.equal(true)
      expect(store.array.$![0]()).to.equal(3)
      expect(isSignal(store.array.$![1])).to.equal(true)
      const arraySignalValue = store.array.$![1]()
      expect(typeof arraySignalValue === 'object' && arraySignalValue.b).to.equal(2)
      expect(typeof store.array[1] === 'object' && store.array[1].$b).to.satisfy(isSignal)
      expect(typeof store.array[1] === 'object' && store.array[1].$b!()).to.equal(2)
    })

    it('should return length signal in arrays using array.$length', () => {
      expect(isSignal(store.array.$length)).to.equal(true)
      expect(store.array.$length!()).to.equal(2)
    })

    it('should not return signals in arrays using array.$index', () => {
      expect((store.array as any).$0).to.be.undefined
    })

    it('should not return signals of functions using store.$function', () => {
      const store = deepSignal({ func: () => {} })
      expect(store.$func).to.be.undefined
    })

    it('should support reading signals from getters', () => {
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
      })
      expect(store.$double!()).to.equal(2)
      store.counter = 2
      expect(store.$double!()).to.equal(4)
    })

    it('should support reading signals from getters returning other parts of the state', () => {
      const store = deepSignal({
        switch: 'a',
        a: { data: 'a' },
        b: { data: 'b' },
        get aOrB() {
          return store.switch === 'a' ? store.a : store.b
        },
      })
      expect(store.aOrB.$data!()).to.equal('a')
      store.switch = 'b'
      expect(store.aOrB.$data!()).to.equal('b')
    })

    it('should return signals from array iterators', () => {
      const store = deepSignal([{ a: 1 }, { a: 2 }])
      const signals = store.map(item => item.$a!())
      expect(signals).to.deep.equal([1, 2])
    })

    it('should return signals from array iterators', () => {
      const store = deepSignal([{ a: 1 }, { a: 2 }])
      const signals = store.map(item => item.$a!())
      expect(signals).to.deep.equal([1, 2])
    })
  })

  describe('set', () => {
    it('should update like plain objects/arrays', () => {
      expect(store.a).to.equal(1)
      expect(store.nested.b).to.equal(2)
      store.a = 2
      store.nested.b = 3
      expect(store.a).to.equal(2)
      expect(store.nested.b).to.equal(3)
    })

    it('should support setting values with setters', () => {
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
        set double(val) {
          store.counter = val / 2
        },
      })
      expect(store.counter).to.equal(1)
      store.double = 4
      expect(store.counter).to.equal(2)
    })

    it('should update array length', () => {
      expect(store.array.length).to.equal(2)
      store.array.push(4)
      expect(store.array.length).to.equal(3)
      store.array.splice(1, 2)
      expect(store.array.length).to.equal(1)
    })

    it('should update array $length', () => {
      expect(store.array.$length!()).to.equal(2)
      store.array.push(4)
      expect(store.array.$length!()).to.equal(3)
      store.array.splice(1, 2)
      expect(store.array.$length!()).to.equal(1)
    })

    it('should update when mutations happen', () => {
      expect(store.a).to.equal(1)
      store.a = 11
      expect(store.a).to.equal(11)
    })

    it('should support setting getters on the fly', () => {
      const store = deepSignal<{ counter: number; double?: number }>({
        counter: 1,
      })
      Object.defineProperty(store, 'double', {
        get: function () {
          return store.counter * 2
        },
      })
      expect(store.double).to.equal(2)
      store.counter = 2
      expect(store.double).to.equal(4)
    })

    it('should throw when mutating the $ properties', () => {
      expect(() => ((store.nested as any).$b = 2)).to.throw()
      expect(() => ((store.array as any).$length = 2)).to.throw()
    })

    it('should throw when trying to mutate the signals array', () => {
      expect(() => ((store.array.$ as any)[0] = 2)).to.throw()
    })

    it('should allow signal assignments', () => {
      const store = deepSignal<{ a?: number }>({})
      const a = signal(1)

      store.$a = a

      expect(store.a).to.equal(1)
      expect(store.$a).to.equal(a)

      store.a = 2

      expect(a()).to.equal(2)
      expect(store.a).to.equal(2)
      expect(store.$a).to.equal(a)
    })

    it('should not create wrong artifacts when assigning signals', () => {
      const store = deepSignal<{ a?: number }>({})
      const a = signal(1)

      store.$a = a

      expect(peek(store as any, '$a')).to.equal(undefined)
      expect(peek(store, 'a')).to.equal(1)
    })

    it('should support Reflect operations with custom receivers', () => {
      const store = deepSignal({
        a: 1,
      })
      const getReceiver = {}
      const setReceiver = {}

      expect(Reflect.get(store, 'a', getReceiver)).to.equal(1)
      expect(Reflect.set(store, 'a', 2, setReceiver)).to.equal(true)
      expect(Reflect.get(store, 'a', setReceiver)).to.equal(2)
    })

    it('should reuse existing proxies when assigning observed objects', () => {
      const obj = { id: 1 }
      const store = deepSignal<{ a: typeof obj; b?: typeof obj }>({
        a: obj,
      })
      const proxied = store.a

      store.b = obj

      expect(store.b).to.equal(proxied)
    })

    it('should not track assigned signal values while assigning signals', () => {
      const store = deepSignal<{ a?: number }>({})
      const a = signal(1)
      let runs = 0

      effect(() => {
        runs++
        store.$a = a
      })

      expect(runs).to.equal(1)
      expect(store.a).to.equal(1)

      a(2)

      expect(runs).to.equal(1)
      expect(store.a).to.equal(2)
    })

    it('should copy object like plain JavaScript', () => {
      const store = deepSignal<{
        a?: { id: number; nested: { id: number } }
        b: { id: number; nested: { id: number } }
      }>({
        b: { id: 1, nested: { id: 1 } },
      })

      store.a = store.b

      expect(store.a.id).to.equal(1)
      expect(store.b.id).to.equal(1)
      expect(store.a.nested.id).to.equal(1)
      expect(store.b.nested.id).to.equal(1)

      store.a.id = 2
      store.a.nested.id = 2
      expect(store.a.id).to.equal(2)
      expect(store.b.id).to.equal(2)
      expect(store.a.nested.id).to.equal(2)
      expect(store.b.nested.id).to.equal(2)

      store.b.id = 3
      store.b.nested.id = 3
      expect(store.b.id).to.equal(3)
      expect(store.a.id).to.equal(3)
      expect(store.a.nested.id).to.equal(3)
      expect(store.b.nested.id).to.equal(3)

      store.a.id = 4
      store.a.nested.id = 4
      expect(store.a.id).to.equal(4)
      expect(store.b.id).to.equal(4)
      expect(store.a.nested.id).to.equal(4)
      expect(store.b.nested.id).to.equal(4)
    })

    it('should be able to reset values with Object.assign', () => {
      const initialNested = { ...nested }
      const initialState = { ...state, nested: initialNested }
      store.a = 2
      store.nested.b = 3
      Object.assign(store, initialState)
      expect(store.a).to.equal(1)
      expect(store.nested.b).to.equal(2)
    })
  })

  describe('delete', () => {
    it('should delete properties before they are accessed', () => {
      delete store.a
      expect(store.a).to.equal(undefined)
    })

    it('should delete properties after they are accessed', () => {
      expect(store.a).to.equal(1)
      delete store.a
      expect(store.a).to.equal(undefined)
    })

    it('should delete nested properties before they are accessed', () => {
      delete store.nested.b
      expect(store.nested.b).to.equal(undefined)
    })

    it('should delete nested properties after they are accessed', () => {
      expect(store.nested.b).to.equal(2)
      delete store.nested.b
      expect(store.nested.b).to.equal(undefined)
    })

    it('should delete properties in arrays before they are accessed', () => {
      delete store.array[0]
      expect(store.array[0]).to.equal(undefined)
    })

    it('should delete properties in arrays after they are accessed', () => {
      expect(store.array[0]).to.equal(3)
      delete store.array[0]
      expect(store.array[0]).to.equal(undefined)
    })

    it('should throw when trying to delete a signal', () => {
      expect(() => delete store.$a).to.throw()
    })

    it('should throw when trying to delete the array signals', () => {
      expect(() => delete store.array.$![1]).to.throw()
    })
  })

  describe('ownKeys', () => {
    it('should return own properties in objects', () => {
      const state: Record<string, number> = { a: 1, b: 2 }
      const store = deepSignal(state)
      let sum = 0

      for (const property in store) {
        sum += store[property]
      }

      expect(sum).to.equal(3)
    })

    it('should return own properties in arrays', () => {
      const state: number[] = [1, 2]
      const store = deepSignal(state)
      let sum = 0

      for (const property of store) {
        sum += property
      }

      expect(sum).to.equal(3)
    })

    it('should spread objects correctly', () => {
      const store2 = { ...store }
      expect(store2.a).to.equal(1)
      expect(store2.nested.b).to.equal(2)
      expect(store2.array[0]).to.equal(3)
      expect(typeof store2.array[1] === 'object' && store2.array[1].b).to.equal(2)
    })

    it('should spread arrays correctly', () => {
      const array2 = [...store.array]
      expect(array2[0]).to.equal(3)
      expect(typeof array2[1] === 'object' && array2[1].b).to.equal(2)
    })
  })

  describe('computations', () => {
    it('should subscribe to values mutated with setters', () => {
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
        set double(val) {
          store.counter = val / 2
        },
      })
      let counter = 0
      let double = 0

      effect(() => {
        counter = store.counter
        double = store.double
      })

      expect(counter).to.equal(1)
      expect(double).to.equal(2)
      store.double = 4
      expect(counter).to.equal(2)
      expect(double).to.equal(4)
    })

    it('should subscribe to changes when an item is removed from the array', () => {
      const store = deepSignal([0, 0, 0])
      let sum = 0

      effect(() => {
        sum = 0
        sum = store.reduce(sum => sum + 1, 0)
      })

      expect(sum).to.equal(3)
      store.splice(2, 1)
      expect(sum).to.equal(2)
    })

    it('should subscribe to changes to for..in loops', () => {
      const state: Record<string, number> = { a: 0, b: 0 }
      const store = deepSignal(state)
      let sum = 0

      effect(() => {
        sum = 0
        for (const _ in store) {
          sum += 1
        }
      })

      expect(sum).to.equal(2)

      store.c = 0
      expect(sum).to.equal(3)

      delete store.c
      expect(sum).to.equal(2)

      store.c = 0
      expect(sum).to.equal(3)
    })

    it('should subscribe to changes for Object.getOwnPropertyNames()', () => {
      const state: Record<string, number> = { a: 1, b: 2 }
      const store = deepSignal(state)
      let sum = 0

      effect(() => {
        sum = 0
        const keys = Object.getOwnPropertyNames(store)
        for (const _ of keys) {
          sum += 1
        }
      })

      expect(sum).to.equal(2)

      store.c = 0
      expect(sum).to.equal(3)

      delete store.a
      expect(sum).to.equal(2)
    })

    it('should subscribe to changes to Object.keys/values/entries()', () => {
      const state: Record<string, number> = { a: 1, b: 2 }
      const store = deepSignal(state)
      let keys = 0
      let values = 0
      let entries = 0

      effect(() => {
        keys = 0
        Object.keys(store).forEach(() => (keys += 1))
      })

      effect(() => {
        values = 0
        Object.values(store as RevertDeepSignal<typeof store>).forEach(() => (values += 1))
      })

      effect(() => {
        entries = 0
        Object.entries(store as RevertDeepSignal<typeof store>).forEach(() => (entries += 1))
      })

      expect(keys).to.equal(2)
      expect(values).to.equal(2)
      expect(entries).to.equal(2)

      store.c = 0
      expect(keys).to.equal(3)
      expect(values).to.equal(3)
      expect(entries).to.equal(3)

      delete store.a
      expect(keys).to.equal(2)
      expect(values).to.equal(2)
      expect(entries).to.equal(2)
    })

    it('should subscribe to changes to for..of loops', () => {
      const store = deepSignal([0, 0])
      let sum = 0

      effect(() => {
        sum = 0
        for (const _ of store) {
          sum += 1
        }
      })

      expect(sum).to.equal(2)

      store.push(0)
      expect(sum).to.equal(3)

      store.splice(0, 1)
      expect(sum).to.equal(2)
    })

    it('should subscribe to implicit changes in length', () => {
      const store = deepSignal(['foo', 'bar'])
      let x = ''

      effect(() => {
        x = store.join(' ')
      })

      expect(x).to.equal('foo bar')

      store.push('baz')
      expect(x).to.equal('foo bar baz')

      store.splice(0, 1)
      expect(x).to.equal('bar baz')
    })

    it('should subscribe to changes when deleting properties', () => {
      let x, y

      effect(() => {
        x = store.a
      })

      effect(() => {
        y = store.nested.b
      })

      expect(x).to.equal(1)
      delete store.a
      expect(x).to.equal(undefined)

      expect(y).to.equal(2)
      delete store.nested.b
      expect(y).to.equal(undefined)
    })

    it('should subscribe to changes when mutating objects', () => {
      let x, y

      const store = deepSignal<{
        a?: { id: number; nested: { id: number } }
        b: { id: number; nested: { id: number } }[]
      }>({
        b: [
          { id: 1, nested: { id: 1 } },
          { id: 2, nested: { id: 2 } },
        ],
      })

      effect(() => {
        x = store.a?.id
      })

      effect(() => {
        y = store.a?.nested.id
      })

      expect(x).to.equal(undefined)
      expect(y).to.equal(undefined)

      store.a = store.b[0]

      expect(x).to.equal(1)
      expect(y).to.equal(1)

      store.a = store.b[1]
      expect(x).to.equal(2)
      expect(y).to.equal(2)

      store.a = undefined
      expect(x).to.equal(undefined)
      expect(y).to.equal(undefined)

      store.a = store.b[1]
      expect(x).to.equal(2)
      expect(y).to.equal(2)
    })

    it('should trigger effects after mutations happen', () => {
      let x
      effect(() => {
        x = store.a
      })
      expect(x).to.equal(1)
      store.a = 11
      expect(x).to.equal(11)
    })

    it('should trigger subscriptions after mutations happen', () => {
      let x

      effect(() => {
        x = store.a
      })

      expect(x).to.equal(1)
      store.a = 11
      expect(x).to.equal(11)
    })

    it('should subscribe corretcly from getters', () => {
      let x
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
      })
      effect(() => {
        x = store.double
      })
      expect(x).to.equal(2)
      store.counter = 2
      expect(x).to.equal(4)
    })

    it('should subscribe corretcly from getters returning other parts of the store', () => {
      let data
      const store = deepSignal({
        switch: 'a',
        a: { data: 'a' },
        b: { data: 'b' },
        get aOrB() {
          return store.switch === 'a' ? store.a : store.b
        },
      })
      effect(() => {
        data = store.aOrB.data
      })
      expect(data).to.equal('a')
      store.switch = 'b'
      expect(data).to.equal('b')
    })

    it('should subscribe to changes', () => {
      const runs = [0, 0, 0, 0, 0]
      let aValue
      let nestedValue
      let nestedBValue
      let arrayFirstValue
      let arrayNestedBValue

      effect(() => {
        runs[0]++
        aValue = store.a
      })
      effect(() => {
        runs[1]++
        nestedValue = store.nested
      })
      effect(() => {
        runs[2]++
        nestedBValue = store.nested.b
      })
      effect(() => {
        runs[3]++
        arrayFirstValue = store.array[0]
      })
      effect(() => {
        runs[4]++
        arrayNestedBValue = typeof store.array[1] === 'object' && store.array[1].b
      })

      expect(runs).to.deep.equal([1, 1, 1, 1, 1])
      expect(aValue).to.equal(1)
      expect(nestedValue).to.deep.equal({ b: 2 })
      expect(nestedBValue).to.equal(2)
      expect(arrayFirstValue).to.equal(3)
      expect(arrayNestedBValue).to.equal(2)

      store.a = 11
      expect(runs).to.deep.equal([2, 1, 1, 1, 1])

      store.nested.b = 22
      expect(runs).to.deep.equal([2, 1, 2, 1, 2])

      store.nested = { b: 222 }
      expect(runs).to.deep.equal([2, 2, 3, 1, 2])

      store.array[0] = 33
      expect(runs).to.deep.equal([2, 2, 3, 2, 2])

      if (typeof store.array[1] === 'object') store.array[1].b = 2222
      expect(runs).to.deep.equal([2, 2, 3, 2, 3])

      store.array[1] = { b: 22222 }
      expect(runs).to.deep.equal([2, 2, 3, 2, 4])

      store.array.push(4)
      expect(runs).to.deep.equal([2, 2, 3, 2, 4])

      store.array[3] = 5
      expect(runs).to.deep.equal([2, 2, 3, 2, 4])

      store.array = [333, { b: 222222 }]
      expect(runs).to.deep.equal([2, 2, 3, 3, 5])
      expect(aValue).to.equal(11)
      expect(nestedBValue).to.equal(222)
      expect(arrayFirstValue).to.equal(333)
      expect(arrayNestedBValue).to.equal(222222)
    })

    it('should subscribe to array length', () => {
      const array = [1]
      const store = deepSignal({ array })
      const runs = [0, 0]
      let lengthValue = 0
      let mappedValue: number[] = []

      effect(() => {
        runs[0]++
        lengthValue = store.array.length
      })
      effect(() => {
        runs[1]++
        mappedValue = store.array.map((i: number) => i)
      })

      expect(runs).to.deep.equal([1, 1])
      expect(lengthValue).to.equal(1)
      expect(mappedValue).to.deep.equal([1])

      store.array.push(2)
      expect(store.array.length).to.equal(2)
      expect(runs).to.deep.equal([2, 2])

      store.array[2] = 3
      expect(store.array.length).to.equal(3)
      expect(runs).to.deep.equal([3, 3])

      store.array = store.array.filter((i: number) => i <= 2)
      expect(store.array.length).to.equal(2)
      expect(runs).to.deep.equal([4, 4])
    })

    it('should be able to reset values with Object.assign and still react to changes', () => {
      const initialNested = { ...nested }
      const initialState = { ...state, nested: initialNested }
      let a, b

      effect(() => {
        a = store.a
      })
      effect(() => {
        b = store.nested.b
      })

      store.a = 2
      store.nested.b = 3

      expect(a).to.equal(2)
      expect(b).to.equal(3)

      Object.assign(store, initialState)

      expect(a).to.equal(1)
      expect(b).to.equal(2)
    })
  })

  describe('peek', () => {
    it('should return correct values when using peek()', () => {
      expect(peek(store, 'a')).to.equal(1)
      expect(peek(store.nested, 'b')).to.equal(2)
      expect(peek(store.array, 0)).to.equal(3)
      const nested = peek(store, 'array')[1]
      expect(typeof nested === 'object' && nested.b).to.equal(2)
      expect(peek(store.array, 'length')).to.equal(2)
    })

    it('should return correct values when using peek() by computed', () => {
      const counter = signal(1)
      const store = computed(() => counter())
      expect(store()).to.equal(1)
      let updateValue
      effect(() => {
        updateValue = store()
      })
      expect(updateValue).to.equal(1)
      counter(2)
      expect(updateValue).to.equal(2)
      expect(store()).to.equal(2)
    })

    it('should not subscribe to changes when peeking', () => {
      const runs = [0, 0, 0, 0, 0, 0]
      let aValue
      let nestedValue
      let nestedChildValue
      let arrayValue
      let arrayNestedValue
      let arrayLength

      effect(() => {
        runs[0]++
        aValue = peek(store, 'a')
      })
      effect(() => {
        runs[1]++
        nestedValue = peek(store, 'nested')
      })
      effect(() => {
        runs[2]++
        nestedChildValue = peek(store, 'nested').b
      })
      effect(() => {
        runs[3]++
        arrayValue = peek(store, 'array')[0]
      })
      effect(() => {
        runs[4]++
        const nested = peek(store, 'array')[1]
        arrayNestedValue = typeof nested === 'object' && nested.b
      })
      effect(() => {
        runs[5]++
        arrayLength = peek(store, 'array').length
      })

      expect(runs).to.deep.equal([1, 1, 1, 1, 1, 1])
      expect(aValue).to.equal(1)
      expect(nestedValue).to.deep.equal({ b: 2 })
      expect(nestedChildValue).to.equal(2)
      expect(arrayValue).to.equal(3)
      expect(arrayNestedValue).to.equal(2)
      expect(arrayLength).to.equal(2)

      store.a = 11
      store.nested.b = 22
      store.nested = { b: 222 }
      store.array[0] = 33
      if (typeof store.array[1] === 'object') store.array[1].b = 2222
      store.array.push(4)

      expect(runs).to.deep.equal([1, 1, 1, 1, 1, 1])
      expect(aValue).to.equal(1)
      expect(nestedValue).not.to.equal(store.nested)
      expect(nestedValue).to.deep.equal({ b: 2222 })
      expect(nestedChildValue).to.equal(2)
      expect(arrayValue).to.equal(3)
      expect(arrayNestedValue).to.equal(2)
      expect(arrayLength).to.equal(2)
    })

    it('should subscribe to some changes but not other when peeking inside an object', () => {
      let runs = 0
      let value

      effect(() => {
        runs++
        value = peek(store.nested, 'b')
      })

      expect(runs).to.equal(1)
      expect(value).to.equal(2)

      store.nested.b = 22

      expect(runs).to.equal(1)
      expect(value).to.equal(2)

      store.nested = { b: 222 }

      expect(runs).to.equal(2)
      expect(value).to.equal(222)

      store.nested.b = 2222

      expect(runs).to.equal(2)
      expect(value).to.equal(222)
    })

    it('should support returning peek from getters', () => {
      const store = deepSignal({
        counter: 1,
        get double() {
          return store.counter * 2
        },
      })
      expect(peek(store, 'double')).to.equal(2)
      store.counter = 2
      expect(peek(store, 'double')).to.equal(4)
    })
  })

  describe('refs', () => {
    it('should preserve object references', () => {
      expect(store.nested).to.equal(store.array[1])
      expect(store.nested.$b).to.equal(typeof store.array[1] === 'object' && store.array[1].$b)

      store.nested.b = 22

      expect(store.nested).to.equal(store.array[1])
      expect(store.nested.$b).to.equal(typeof store.array[1] === 'object' && store.array[1].$b)
      expect(store.nested.b).to.equal(22)
      expect(typeof store.array[1] === 'object' && store.array[1].b).to.equal(22)

      store.nested = { b: 222 }

      expect(store.nested).to.not.equal(store.array[1])
      expect(store.nested.$b).to.not.equal(typeof store.array[1] === 'object' && store.array[1].$b)
      expect(store.nested.b).to.equal(222)
      expect(typeof store.array[1] === 'object' && store.array[1].b).to.equal(22)
    })

    it('should return the same proxy if initialized more than once', () => {
      const state = {}
      const store1 = deepSignal(state)
      const store2 = deepSignal(state)
      expect(store1).to.equal(store2)
    })

    it('should throw when trying to create a deepsignal of a proxy', () => {
      const store1 = deepSignal({})
      expect(() => deepSignal(store1)).to.throw()
    })
  })

  describe('unsupported data structures', () => {
    it('should throw when trying to deepsignal a class instance', () => {
      class MyClass {}
      const obj = new MyClass()
      expect(() => deepSignal(obj)).to.throw()
    })

    it('should not wrap a class instance', () => {
      class MyClass {}
      const obj = new MyClass()
      const store = deepSignal({ obj })
      expect(store.obj).to.equal(obj)
    })

    it('should not wrap built-ins in proxies', () => {
      window.MyClass = class MyClass {}
      const obj = new window.MyClass()
      const store = deepSignal({ obj })
      expect(store.obj).to.equal(obj)
    })

    it('should not wrap elements in proxies', () => {
      const document = (window as { document?: { createElement: (tagName: string) => unknown } }).document
      if (!document) return
      const el = document.createElement('div')
      const store = deepSignal({ el })
      expect(store.el).to.equal(el)
    })

    it('should wrap global objects', () => {
      window.obj = { b: 2 }
      const store = deepSignal(window.obj)
      expect(store).to.not.equal(window.obj)
      expect(store).to.deep.equal({ b: 2 })
      expect(isSignal(store.$b)).to.equal(true)
      expect(store.$b()).to.equal(2)
    })

    it('should not wrap dates', () => {
      const date = new Date()
      const store = deepSignal({ date })
      expect(store.date).to.equal(date)
    })

    it('should not wrap regular expressions', () => {
      const regex = new RegExp('')
      const store = deepSignal({ regex })
      expect(store.regex).to.equal(regex)
    })

    it('should not wrap Map', () => {
      const map = new Map()
      const store = deepSignal({ map })
      expect(store.map).to.equal(map)
    })

    it('should not wrap Set', () => {
      const set = new Set()
      const store = deepSignal({ set })
      expect(store.set).to.equal(set)
    })
  })

  describe('symbols', () => {
    it('should observe symbols', () => {
      const key = Symbol('key')
      let x
      const store = deepSignal<{ [key: symbol]: any }>({})
      effect(() => (x = store[key]))

      expect(store[key]).to.equal(undefined)
      expect(x).to.equal(undefined)

      store[key] = true

      expect(store[key]).to.equal(true)
      expect(x).to.equal(true)
    })

    it('should not observe well-known symbols', () => {
      const key = Symbol.isConcatSpreadable
      let x
      const state = deepSignal<{ [key: symbol]: any }>({})
      effect(() => (x = state[key]))

      expect(state[key]).to.equal(undefined)
      expect(x).to.equal(undefined)

      state[key] = true
      expect(state[key]).to.equal(true)
      expect(x).to.equal(undefined)
    })
  })

  describe('shallow', () => {
    it('should proxy only shallow root properties', () => {
      const shallowObj1 = { a: 1, nested: { b: 2 } }
      let shallowObj2 = { c: 3 }
      const deepObj = { c: 3 }
      shallowObj2 = shallow(shallowObj2)
      const store = deepSignal({
        shallowObj1: shallow(shallowObj1),
        shallowObj2,
        deepObj,
      })
      expect(store.shallowObj1.a).to.equal(1)
      expect(store.shallowObj1.nested).to.equal(shallowObj1.nested)
      expect(store.shallowObj2.c).to.equal(3)
      expect(store.deepObj.c).to.equal(3)
      expect(store.shallowObj1).to.not.equal(shallowObj1)
      expect(store.shallowObj2).to.equal(shallowObj2)
      expect(store.deepObj).to.not.equal(deepObj)
    })

    it('should reuse shallow proxies', () => {
      const obj = { a: 1 }
      const shallowObj = shallow(obj)

      expect(shallow(obj)).to.equal(shallowObj)
      expect(shallow(shallowObj)).to.equal(shallowObj)
    })

    it('should observe changes in the shallow object if the reference changes', () => {
      const obj = { a: 1 }
      const shallowObj = shallow(obj)
      const store = deepSignal({ shallowObj })
      let x
      effect(() => {
        x = store.shallowObj.a
      })
      expect(x).to.equal(1)
      store.shallowObj = shallow({ a: 2 })
      expect(x).to.equal(2)
    })

    it('should observe changes in root props of a shallow object', () => {
      const obj = { a: 1 }
      const shallowObj = shallow(obj)
      let x

      effect(() => {
        x = shallowObj.a
      })

      expect(x).to.equal(1)
      shallowObj.a = 2
      expect(x).to.equal(2)
    })

    it('should not observe changes in nested props of a shallow object', () => {
      const obj = { nested: { a: 1 } }
      const shallowObj = shallow(obj)
      let x

      effect(() => {
        x = shallowObj.nested.a
      })

      expect(x).to.equal(1)
      shallowObj.nested.a = 2
      expect(x).to.equal(1)
    })

    it('should observe nested reference changes in a shallow object', () => {
      const obj = { nested: { a: 1 } }
      const shallowObj = shallow(obj)
      let x

      effect(() => {
        x = shallowObj.nested.a
      })

      expect(x).to.equal(1)
      shallowObj.nested = { a: 2 }
      expect(x).to.equal(2)
    })
  })

  describe('markRaw', () => {
    it('should not proxy marked raw objects', () => {
      const rawObj = { a: 1 }
      const deepObj = { b: 2 }
      const store = deepSignal({
        rawObj: markRaw(rawObj),
        deepObj,
      })

      expect(store.rawObj).to.equal(rawObj)
      expect(store.deepObj).to.not.equal(deepObj)
    })

    it('should track marked raw references but not nested mutations', () => {
      const rawObj = markRaw({ a: 1 })
      const store = deepSignal({ rawObj })
      let value

      effect(() => {
        value = store.rawObj.a
      })

      expect(value).to.equal(1)
      store.rawObj.a = 2
      expect(value).to.equal(1)

      store.rawObj = markRaw({ a: 3 })
      expect(value).to.equal(3)
    })

    it('should expose raw as an alias for markRaw', () => {
      const rawObj = { a: 1 }
      const store = deepSignal({
        rawObj: raw(rawObj),
      })

      expect(store.rawObj).to.equal(rawObj)
    })
  })
})
