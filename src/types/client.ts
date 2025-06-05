
import type { EventEmitter } from '@/class/emitter.js'
import type { NIP46Client }  from '@/class/client.js'
import type { SessionToken } from './session.js'

import type {
  RequestMessage,
  SignedMessage,
  ResponseMessage
} from './message.js'

import type { SignedEvent } from './event.js'

export interface ClientConfig {
  req_timeout : number
  start_delay : number
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
  req : EventEmitter<Record<string, [ RequestMessage  ]>>
  res : EventEmitter<Record<string, [ ResponseMessage ]>>
}

export interface ClientEventMap extends Record<string, any> {
  'bounced'    : [ event_id : string, error : string ]
  'closed'     : [ client: NIP46Client ]
  'debug'      : unknown[]
  'error'      : unknown[]
  'info'       : unknown[]
  'event'      : [ event: SignedEvent ]
  'message'    : [ message: SignedMessage ]
  'ready'      : [ client: NIP46Client ]
  'subscribed' : [ sub_id : string ]
  'activated'  : [ token: SessionToken ]
  'issued'     : [ token: SessionToken ]
  'pending'    : [ token: SessionToken ]
  'request'    : [ message: RequestMessage ]
}
