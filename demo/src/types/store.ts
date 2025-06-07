import type { RelayPolicy }  from '@/demo/types/node.js'
import type { SessionToken } from '@/types/index.js'

export interface AppStore {
  nsec     : string | null
  relays   : RelayPolicy[]
  sessions : SessionToken[]
}
