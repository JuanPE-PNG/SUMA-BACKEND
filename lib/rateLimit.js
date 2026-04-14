const store = new Map()

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5 } = {}) {
  return function check(identifier) {
    const now = Date.now()
    const windowStart = now - windowMs

    const history = (store.get(identifier) || []).filter((t) => t > windowStart)

    if (history.length >= max) {
      return { allowed: false, remaining: 0, retryAfterMs: windowMs }
    }

    history.push(now)
    store.set(identifier, history)

    return { allowed: true, remaining: max - history.length }
  }
}

export const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 })
