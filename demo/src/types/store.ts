import type {
  LogEntry,
  RelayPolicy
} from '@/demo/types/node.js'

import type { SessionToken } from '@/types/index.js'

export interface AppStore {
  logs     : LogEntry[]
  nsec     : string | null
  relays   : RelayPolicy[]
  sessions : SessionToken[]
}
