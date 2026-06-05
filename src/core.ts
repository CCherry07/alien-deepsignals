export * from 'alien-signals'
import { endBatch, startBatch } from 'alien-signals'

export type Signal<T = any> = {
  (): T
  (value: T): void
}

export type Computed<T = any> = () => T

export const batch = <T>(fn: () => T): T => {
  startBatch()
  try {
    return fn()
  } finally {
    endBatch()
  }
}
