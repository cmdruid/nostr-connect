
import type { NostrClient }   from '@/class/client.js'
import type { EventEmitter }  from '@/class/emitter.js'
import type { SignedMessage } from './message.js'

import type { EventFilter, SignedEvent }  from './event.js'

export interface ClientConfig {
  kind         : number
  filter       : EventFilter
  req_timeout  : number
  since_offset : number
  start_delay  : number
}

export interface PublishResponse {
  acks  : string[]
  fails : string[]
  ok    : boolean
}

export interface PublishedEvent extends PublishResponse {
  event : SignedEvent
}

export interface ClientInboxMap {
  id     : EventEmitter<Record<string, [ SignedMessage ]>>
  method : EventEmitter<Record<string, [ SignedMessage ]>>
  pubkey : EventEmitter<Record<string, [ SignedMessage ]>>
}

export interface ClientEventMap extends Record<string, any> {
  'bounced'    : [ event_id : string, error : string ]
  'closed'     : [ client: NostrClient ]
  'debug'      : unknown[]
  'error'      : unknown[]
  'info'       : unknown[]
  'message'    : [ message: SignedMessage ]
  'ready'      : [ client: NostrClient ]
  'subscribed' : [ sub_id : string, filter : EventFilter ]
}
