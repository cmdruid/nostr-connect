import type { SignedEvent } from './event.js'

export interface PublishResponse {
  acks  : number
  fails : number
  ok    : boolean
}

export interface PublishReceipt extends PublishResponse {
  event : SignedEvent
}

export interface SocketConfig {
  req_timeout : number
  sub_timeout : number
}

export interface SocketOptions extends Partial<SocketConfig> {
  relays? : string[]
}
