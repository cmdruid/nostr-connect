import type {
  LogEntry,
  RelayPolicy
} from '@/demo/types/node.js'

export type AppStore = StoreInit | StoreReady

export interface BaseStore {
  relays : RelayPolicy[]
  logs   : LogEntry[]
  nsec   : string | null
}

export interface StoreInit extends BaseStore {
  group : null
  share : null
}

export interface StoreReady extends BaseStore {

}
