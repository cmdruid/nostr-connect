import type { RelayPolicy }  from '@/demo/types/node.js'
import type { AgentSession } from '@/types/index.js'

export interface AppStore {
  encrypted : string | null
  relays    : RelayPolicy[]
  sessions  : AgentSession[]
}
