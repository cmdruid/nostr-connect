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
import { InviteToken, JoinEvent } from './invite.js'

export interface BaseEventMap extends Record<string, any[]> {
  '*'   : any[]
  info  : any[]
  error : any[]
  warn  : any[]
  debug : any[]
}

export interface ClientEventMap extends BaseEventMap {
  close : [ void ]
  ready : [ void ]
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

export interface InviteEventMap extends BaseEventMap {
  invite  : [ InviteToken ]
  cancel  : [ string ]
  join    : [ JoinEvent ]
  expired : [ string ]
  revoke  : [ void   ]
}

export interface RequestEventMap extends BaseEventMap {
  prompt  : [ PermissionRequest ]
  approve : [ PermissionRequest ]
  deny    : [ PermissionRequest, string ]
  resolve : [ PermissionRequest, string ]
  reject  : [ PermissionRequest, string ]
  timeout : [ PermissionRequest ]
  update  : [ SignerSession ]
}

export interface SessionEventMap extends BaseEventMap {
  pending   : [ SignerSession ]
  active    : [ SignerSession ]
  cleared   : [ void ]
  expired   : [ SignerSession ]
  revoked   : [ string ]
  updated   : [ Partial<SignerSession> ]
  message   : [ RequestMessage ]
  request   : [ PermissionRequest ]
}
