import { watch } from "./watch"
import type { WatchEffect } from "./watch"

export function watchEffect(effect: WatchEffect) {
  return watch(effect, undefined)
}
