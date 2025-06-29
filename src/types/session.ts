import type { HostProfile }      from './channel.js'
import type { RequestMessage }   from './message.js'
import type { PermissionPolicy } from './request.js'

export interface BaseToken {
  profile : HostProfile
  pubkey  : string
  relays  : string[]
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
