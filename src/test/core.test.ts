import { batch, computed } from "../index"
import { isSignal, unSignal, toValue } from "../utils"
import { describe, it, expect } from "vitest"
import { signal, effect } from "..";

describe('core', () => {
  it('basic signal', () => {
    const a = signal(1);
    expect(a.value).toBe(1);
    a.value = 2;
    expect(a.value).toBe(2);
  });

  it('computed', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    expect(b.peek()).toBe(2);
    a.value = 2;
    expect(b.peek()).toBe(3);
  });

  it('effect', () => {
    const a = signal(1);
    let dummy;
    effect(() => {
      dummy = a.value;
    });
    expect(dummy).toBe(1);
    a.value = 2;
    expect(dummy).toBe(2);
  });

  it('nested computed', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value + 1);
    expect(c.peek()).toBe(3);
    a.value = 2;
    expect(c.peek()).toBe(4);
  });

  it('nested effect', () => {
    const a = signal(1);
    const b = signal(2);
    let dummy;
    effect(() => {
      dummy = a.value + b.value;
    });
    expect(dummy).toBe(3);
    a.value = 2;
    expect(dummy).toBe(4);
    b.value = 3;
    expect(dummy).toBe(5);
  });

  it('computed in effect', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    let dummy;
    effect(() => {
      dummy = b.value;
    });
    expect(dummy).toBe(2);
    a.value = 2;
    expect(dummy).toBe(3);
  });

  it('effect in effect', () => {
    const a = signal(1);
    const b = signal(2);
    let dummy;
    effect(() => {
      effect(() => {
        dummy = a.value + b.value;
      });
    });
    expect(dummy).toBe(3);
    a.value = 2;
    expect(dummy).toBe(4);
    b.value = 3;
    expect(dummy).toBe(5);
  });

  it('computed in computed', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value + 1);
    expect(c.peek()).toBe(3);
    a.value = 2;
    expect(c.peek()).toBe(4);
  });

  it('batch updates', () => {
    const a = signal(1);
    const b = signal(2);
    let dummy = undefined as unknown as number;
    effect(() => {
      dummy = a.value + b.value;
    });
    expect(dummy).toBe(3);
    batch(() => {
      a.value = 2;
      b.value = 3;
      expect(dummy).toBe(3);
    });
    expect(dummy).toBe(5);
  });

  it('unSignal', () => {
    const a = signal(1);
    expect(unSignal(a)).toBe(1);
  });

  it('isSignal', () => {
    const a = signal(1);
    const b = computed(()=> a.value)
    expect(isSignal(a)).toBe(true);
    expect(isSignal(1)).toBe(false);
    expect(isSignal(b)).toBe(false);
  });

  it('toValue', () => {
    const a = signal(1);
    expect(toValue(a)).toBe(1);
    expect(toValue(2)).toBe(2);
    expect(toValue(() => 3)).toBe(3);
    const b = computed(() => a.value + 1);
    expect(toValue(b)).toBe(2);
  });

  it('peek', () => {
    const a = signal(1);
    expect(a.peek()).toBe(1);
    a.value = 2;
    expect(a.peek()).toBe(2);
  });
});
