import type { AppStore } from '@/demo/types/index.js'

export const LOG_LIMIT = 100

export const PING_IVAL = 10

export const STORE_KEY = 'nip46-demo'

export const DEFAULT_STORE : AppStore = {
  logs     : [],
  nsec     : null,
  relays   : [],
  sessions : []
}
