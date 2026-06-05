# 🧶 AlienDeepSignals

Use [alien-signals](https://github.com/stackblitz/alien-signals) with the interface of a plain JavaScript object.

- **DeepSignal** works by wrapping the object with a `Proxy` that intercepts all property accesses and returns the signal value by default.
- This allows you to easily create a **deep object that can be observed for changes**, while still being able to **mutate the object normally**.
- Nested objects and arrays are also converted to deep signal objects/arrays, allowing you to create **fully reactive data structures**.
- The `$` prefix returns the signal instance: `state.$prop`.

## Credits

- The ability of deepsignal comes from [deepsignal](https://github.com/luisherranz/deepsignal), thank [luisherranz](https://github.com/luisherranz).

## Features

- **Transparent**: `deepsignal` wraps the object with a proxy that intercepts all property accesses, but does not modify how you interact with the object. This means that you can still use the object as you normally would, and it will behave exactly as you would expect, except that mutating the object also updates the value of the underlying signals.
- **Tiny (less than 1kB)**: `deepsignal` is designed to be lightweight and has a minimal footprint, making it easy to include in your projects. It's just a small wrapper around `alien-signals`.
- **Full array support**: `deepsignal` fully supports arrays, including nested arrays.
- **Deep**: `deepsignal` converts nested objects and arrays to deep signal objects/arrays, allowing you to create fully reactive data structures.
- **Lazy initialization**: `deepsignal` uses lazy initialization, which means that signals and proxies are only created when they are accessed for the first time. This reduces the initialization time to almost zero and improves the overall performance in cases where you only need to observe a small subset of the object's properties.
- **Stable references**: `deepsignal` uses stable references, which means that the same `Proxy` instances will be returned for the same objects so they can exist in different places of the data structure, just like regular JavaScript objects.
- **Automatic derived state**: getters are automatically converted to computeds instead of signals.
- **TypeScript support**: `deepsignal` is written in TypeScript and includes type definitions, so you can use it seamlessly with your TypeScript projects, including access to the signal value through the prefix `state.$prop`.
- **State management**: `deepsignal` can be used as a state manager, including state and actions in the same object.

The most important feature is that **it just works**. You don't need to do anything special. Just create an object, mutate it normally and all your components will know when they need to rerender.

## Installation

```bash
npm install alien-deepsignals
```

## Usage

```ts
import { deepSignal } from 'alien-deepsignals';
const state = deepSignal({
  count: 0,
  name: 'John',
  nested: {
    deep: 'value',
  },
  array: [1, 2, 3],
});
state.count++;
state.$nested().deep = 'new value';
state.$array().push(4);
```
### watch
```ts
import { deepSignal, watch } from 'alien-deepsignals';
const state = deepSignal({
  count: 0,
  name: 'John',
  nested: {
    deep: 'value',
  },
  array: [1, 2, 3],
});

watch(state,(value)=>{
  console.log(value);
},{
  deep: true,
  immediate: true,
  // once
})
```
