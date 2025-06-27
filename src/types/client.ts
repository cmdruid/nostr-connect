import type {
  RequestMessage,
  SignedMessage,
  ResponseMessage
} from './message.js'

import type { SignedEvent } from './event.js'

export interface ClientOptions extends Partial<ClientConfig> {
  relays? : string[]
}

export interface ClientConfig {
  timeout : number
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
  'bounced'      : [ event: SignedEvent, error: string ]
  'closed'       : []
  'debug'        : unknown[]
  'disconnected' : []
  'error'        : unknown[]
  'event'        : [ event: SignedEvent ]
  'info'         : unknown[]
  'message'      : [ message: SignedMessage ]
  'ready'        : []
  'request'      : [ message: RequestMessage ]
  'response'     : [ message: ResponseMessage ]
  'subscribed'   : []
  'unsubscribed' : []
  'published'    : [ response: PublishedEvent ]
}
