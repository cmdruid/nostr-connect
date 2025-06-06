
import type { EventEmitter } from '@/class/emitter.js'
import type { NIP46Client }  from '@/class/client.js'
import type { SessionToken } from './session.js'

import type {
  RequestMessage,
  SignedMessage,
  ResponseMessage
} from './message.js'

import type { SignedEvent } from './event.js'

export interface ClientOptions {
  debug?          : boolean
  relays?         : string[]
  sessions?       : SessionToken[]
  req_timeout?    : number
  invite_timeout? : number
  verbose?        : boolean
}

export interface ClientConfig {
  debug          : boolean
  req_timeout    : number
  invite_timeout : number
  verbose        : boolean
}

export interface PublishResponse {
  acks  : number
  fails : number
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
  'subscribed' : []
  'request'    : [ message: RequestMessage ]
}
