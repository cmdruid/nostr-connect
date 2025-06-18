export type PermissionMap = Record<string, boolean | number[]>

export interface BaseToken {
  pubkey     : string
  relays     : string[]
  perms?     : PermissionMap
  name?      : string
  url?       : string
  image?     : string
}

export interface ConnectionToken extends BaseToken {
  secret : string
}

export interface SessionOptions {
  perms? : PermissionMap,
  name?  : string,
  url?   : string,
  image? : string
}

export interface SessionConfig extends SessionOptions {
  name   : string
  pubkey : string
  relays : string[]
}

export type SessionParams = [
  pubkey : string,
  perms? : PermissionMap,
  name?  : string,
  url?   : string,
  image? : string
]

export interface SessionToken extends BaseToken {
  created_at : number
}

export interface SessionManagerOptions extends Partial<SessionManagerConfig> {
  sessions? : SessionToken[]
}

export interface SessionManagerConfig {
  debug   : boolean
  timeout : number
  verbose : boolean
}

export interface SessionEventMap extends Record<string, any> {
  activated : [ SessionToken ]
  cleared   : [ void ]
  revoked   : [ string ]
  pending   : [ SessionToken ]
  updated   : [ SessionToken ]
}
