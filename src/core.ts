import { createReactiveSystem, Link, ReactiveNode, ReactiveFlags } from 'alien-signals/system';
import { SignalFlags } from './contents';

const {
  link,
  unlink,
  propagate,
  checkDirty,
  shallowPropagate,
} = createReactiveSystem({
  update(signal: Computed | Signal) {
    return signal.update();
  },
  notify(effect: Effect) {
    queue.push(effect);
  },
  unwatched() { },
});

let cycle = 0;
let batchDepth = 0;
let activeSub: ReactiveNode | undefined;

const queue: Effect[] = [];

const pauseStack: (ReactiveNode | undefined)[] = [];
export function pauseTracking() {
  pauseStack.push(activeSub);
  activeSub = undefined;
}

export function resumeTracking() {
  activeSub = pauseStack.pop();
}

export const untracked = <T>(fn: () => T): T => {
  pauseTracking();
  try { return fn(); }
  finally { resumeTracking(); }
};

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(oldValue: T): Signal<T>;
export function signal<T>(oldValue?: T): Signal<T | undefined> {
  return new Signal(oldValue);
}

export function computed<T>(getter: () => T): Computed<T> {
  return new Computed<T>(getter);
}

export function effect<T>(fn: () => T): Effect<T> {
  const e = new Effect(fn);
  e.run();
  return e;
}

export function startBatch() {
  ++batchDepth;
}

export function endBatch() {
  if (--batchDepth === 0) {
    flush();
  }
}

export function batch<T>(fn: () => T): T {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

function flush() {
  while (queue.length > 0) {
    queue.shift()!.scheduler();
  }
}

function shouldUpdate(sub: ReactiveNode): boolean {
  const flags = sub.flags;
  if (flags & ReactiveFlags.Dirty) {
    return true;
  }
  if (flags & ReactiveFlags.Pending) {
    if (checkDirty(sub.deps!, sub)) {
      return true;
    }
    sub.flags = flags & ~ReactiveFlags.Pending;
  }
  return false;
}

export class Signal<T = any> implements ReactiveNode {
  readonly [SignalFlags.IS_SIGNAL] = true;
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;
  flags: ReactiveFlags = ReactiveFlags.Mutable;
  currentValue: T;
  pendingValue: T;

  constructor(value: T) {
    this.pendingValue = this.currentValue = value;
  }

  get(): T {
    if (shouldUpdate(this) && this.update()) {
      const subs = this.subs;
      if (subs !== undefined) {
        shallowPropagate(subs);
      }
    }
    if (activeSub !== undefined) {
      link(this, activeSub, cycle);
    }
    return this.currentValue;
  }

  set(value: T): void {
    this.pendingValue = value;
    this.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
    const subs = this.subs;
    if (subs !== undefined) {
      propagate(subs);
      if (batchDepth === 0) {
        flush();
      }
    }
  }

  update() {
    this.flags = ReactiveFlags.Mutable;
    return this.currentValue !== (this.currentValue = this.pendingValue);
  }

  get value(): T {
    return this.get();
  }

  set value(value: T) {
    this.set(value);
  }

  peek(): T {
    return this.pendingValue;
  }
}

export class Computed<T = any> implements ReactiveNode {
  readonly [SignalFlags.IS_SIGNAL] = true;
  currentValue: T | undefined = undefined;
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  flags: ReactiveFlags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;

  constructor(
    public getter: () => T
  ) { }

  get(): T {
    if (shouldUpdate(this) && this.update()) {
      const subs = this.subs;
      if (subs !== undefined) {
        shallowPropagate(subs);
      }
    }
    if (activeSub !== undefined) {
      link(this, activeSub, cycle);
    }
    return this.currentValue!;
  }

  get value(): T {
    return this.get();
  }

  peek(): T {
    return untracked(this.getter);
  }

  update(): boolean {
    ++cycle;
    this.depsTail = undefined;
    this.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
    const prevSub = activeSub;
    activeSub = this;
    try {
      return this.currentValue !== (this.currentValue = this.getter());
    } finally {
      activeSub = prevSub;
      this.flags &= ~ReactiveFlags.RecursedCheck;
      let toRemove = this.depsTail !== undefined ? (this.depsTail as Link).nextDep : this.deps;
      while (toRemove !== undefined) {
        toRemove = unlink(toRemove, this);
      }
    }
  }
}

export class Effect<T = any> implements ReactiveNode {
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  flags: ReactiveFlags = ReactiveFlags.Watching;

  constructor(
    public fn: () => T
  ) { }

  run(): T {
    ++cycle;
    this.depsTail = undefined;
    this.flags = ReactiveFlags.Watching | ReactiveFlags.RecursedCheck;
    const prevSub = activeSub;
    activeSub = this;
    try {
      return this.fn();
    } finally {
      activeSub = prevSub;
      this.flags &= ~ReactiveFlags.RecursedCheck;
      let toRemove = this.depsTail !== undefined ? (this.depsTail as Link).nextDep : this.deps;
      while (toRemove !== undefined) {
        toRemove = unlink(toRemove, this);
      }
    }
  }

  scheduler(): void {
    if (this.shouldUpdate) {
      this.run()
    }
  }

  get shouldUpdate(): boolean {
    return shouldUpdate(this);
  }

  stop(): void {
    let dep = this.deps;
    while (dep !== undefined) {
      dep = unlink(dep, this);
    }
  }

  dirty(): boolean {
    return shouldUpdate(this);
  }
}
