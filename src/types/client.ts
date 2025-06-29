import type { SignedEvent } from './event.js'

export interface PublishResponse {
  acks  : number
  fails : number
  ok    : boolean
}

export interface PublishReceipt extends PublishResponse {
  event : SignedEvent
}

export interface ClientConfig {
  timeout : number
}

export interface ClientOptions extends Partial<ClientConfig> {
  relays? : string[]
}
