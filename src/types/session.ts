import type { RequestMessage }   from './message.js'
import type { PermissionPolicy } from './perms.js'

export interface BaseToken {
  name   : string
  pubkey : string
  relays : string[]
  url?   : string
  image? : string
}

export interface ConnectionToken extends BaseToken {
  policy : PermissionPolicy
  secret : string
}

export interface SessionToken extends BaseToken {
  policy     : PermissionPolicy
  created_at : number
}

export interface SessionTokenOptions {
  policy? : PermissionPolicy
  name?   : string
  url?    : string
  image?  : string
}

export interface SessionTokenConfig extends SessionTokenOptions {
  name   : string
  pubkey : string
  relays : string[]
}

export interface SessionManagerOptions extends Partial<SessionManagerConfig> {
  sessions? : SessionToken[]
}

export interface SessionManagerConfig {
  policy  : PermissionPolicy,
  timeout : number
}

export interface SessionEventMap extends Record<string, any> {
  activated : [ SessionToken ]
  cleared   : [ void ]
  request   : [ RequestMessage, SessionToken ]
  revoked   : [ string ]
  pending   : [ SessionToken ]
  updated   : [ SessionToken ]
}
