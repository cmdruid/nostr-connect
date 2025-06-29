import type { ChannelMember }     from './channel.js'
import type { PublishReceipt }    from './client.js'
import type { SignedEvent }       from './event.js'
import type { PermissionRequest } from './perm.js'
import type { SessionToken      } from './session.js'

import type {
  AcceptTemplate,
  RejectTemplate,
  RequestMessage,
  ResponseMessage,
  SignedMessage
} from './message.js'

export interface BaseEventMap extends Record<string, any[]> {
  '*'   : any[]
  info  : any[]
  error : any[]
  warn  : any[]
  debug : any[]
}

export interface ClientEventMap extends BaseEventMap {
  bounced      : [ event: SignedEvent, error: string ]
  closed       : []
  disconnected : []
  event        : [ event: SignedEvent ]
  message      : [ message: SignedMessage ]
  ready        : []
  request      : [ message: RequestMessage ]
  response     : [ message: ResponseMessage ]
  ping         : [ recipient: string ]
  pong         : [ recipient: string ]
  accept       : [ message: AcceptTemplate, recipient: string ]
  reject       : [ message: RejectTemplate, recipient: string ]
  subscribed   : []
  unsubscribed : []
  published    : [ event: SignedEvent ]
  sent         : [ receipt : PublishReceipt ]
}


export interface ChannelEventMap extends BaseEventMap {
  join    : [ ChannelMember ]
  leave   : [ ChannelMember ]
  invite  : [ string ]
  cancel  : [ string ]
  cleared : [ void ]
  expired : [ string ]
}

export interface RequestEventMap extends BaseEventMap {
  request : [ PermissionRequest ]
  approve : [ PermissionRequest ]
  deny    : [ PermissionRequest, string ]
  error   : [ PermissionRequest, string ]
}

export interface SessionEventMap extends BaseEventMap {
  message   : [ RequestMessage ]
  activated : [ SessionToken ]
  cleared   : [ void ]
  expired   : [ SessionToken ]
  revoked   : [ string ]
  pending   : [ SessionToken ]
  updated   : [ Partial<SessionToken> ]
}
