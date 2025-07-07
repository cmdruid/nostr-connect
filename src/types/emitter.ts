import type { AgentSession }     from './agent.js'
import type { SignedEvent }       from './event.js'
import type { PermissionRequest } from './request.js'
import type { SignerSession }      from './session.js'
import type { PublishReceipt }    from './socket.js'

import type {
  AcceptTemplate,
  RejectTemplate,
  RequestMessage,
  ResponseMessage,
  SignedMessage
} from './message.js'
import { InviteToken } from './invite.js'

export interface BaseEventMap extends Record<string, any[]> {
  '*'   : any[]
  info  : any[]
  error : any[]
  warn  : any[]
  debug : any[]
}

export interface SocketEventMap extends BaseEventMap {
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

export interface AgentEventMap extends BaseEventMap {
  invite  : [ InviteToken ]
  join    : [ AgentSession ]
  close   : [ void ]
  ready   : [ void ]
}

export interface RequestEventMap extends BaseEventMap {
  prompt  : [ PermissionRequest ]
  approve : [ PermissionRequest ]
  deny    : [ PermissionRequest, string? ]
  error   : any[]
  timeout : [ PermissionRequest ]
  update  : [ SignerSession ]
}

export interface SessionEventMap extends BaseEventMap {
  message   : [ RequestMessage ]
  activated : [ SignerSession ]
  cleared   : [ void ]
  expired   : [ SignerSession ]
  request   : [ PermissionRequest ]
  revoked   : [ string ]
  pending   : [ SignerSession ]
  updated   : [ Partial<SignerSession> ]
}
