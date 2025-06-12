
import type { SessionToken } from './session.js'

import type {
  RequestMessage,
  SignedMessage,
  ResponseMessage
} from './message.js'

import type { SignedEvent } from './event.js'

export interface ClientOptions {
  debug?           : boolean
  relays?          : string[]
  sessions?        : SessionToken[]
  req_timeout?     : number
  invite_timeout?  : number
  pending_timeout? : number
  verbose?         : boolean
}

export interface ClientConfig {
  debug           : boolean
  req_timeout     : number
  invite_timeout  : number
  pending_timeout : number
  verbose         : boolean
}

export interface PublishResponse {
  acks  : number
  fails : number
  ok    : boolean
}

export interface PublishedEvent extends PublishResponse {
  event : SignedEvent
}

export interface ClientEventMap extends Record<string, any> {
  'bounced'    : [ event: SignedEvent, error: string ]
  'closed'     : []
  'debug'      : unknown[]
  'error'      : unknown[]
  'event'      : [ event: SignedEvent ]
  'info'       : unknown[]
  'message'    : [ message: SignedMessage ]
  'ready'      : []
  'request'    : [ message: RequestMessage, session: SessionToken ]
  'response'   : [ message: ResponseMessage ]
  'subscribed' : [ relays: string[] ]
}
