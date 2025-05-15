
import type { NostrClient }   from '@/class/client.js'
import type { EventEmitter }  from '@/class/emitter.js'

import type {
  RequestMessage,
  SignedMessage,
  ResponseMessage
} from './message.js'

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
  author   : EventEmitter<Record<string, [ SignedMessage   ]>>
  request  : EventEmitter<Record<string, [ RequestMessage  ]>>
  response : EventEmitter<Record<string, [ ResponseMessage ]>>
}

export interface ClientEventMap extends Record<string, any> {
  'bounced'    : [ event_id : string, error : string ]
  'closed'     : [ client: NostrClient ]
  'debug'      : unknown[]
  'error'      : unknown[]
  'info'       : unknown[]
  'event'      : [ event: SignedEvent ]
  'message'    : [ message: SignedMessage   ]
  'ready'      : [ client: NostrClient ]
  'subscribed' : [ sub_id : string, filter : EventFilter ]
}
