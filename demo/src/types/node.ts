import type { MutableRefObject } from 'react'
import type { NIP46Client }      from '@/class/client'

export type LogType    = 'info' | 'error' | 'warning' | 'success' | 'sign' | 'req' | 'res' | 'ready'
export type NodeStatus = 'stopped' | 'online' | 'offline'

export interface NodeAPI {
  ref    : MutableRefObject<NIP46Client | null>
  reset  : () => void
  stop   : () => void
  status : NodeStatus
}

export interface LogEntry {
  timestamp : number
  message   : string
  type      : string
  payload?  : any
}

export interface PeerStatus {
  pubkey  : string
  status  : 'online' | 'offline' | 'checking'
  updated : number
}

export interface RelayPolicy {
  url   : string
  read  : boolean
  write : boolean
}
