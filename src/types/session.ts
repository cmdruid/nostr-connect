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

export interface SessionEventMap extends Record<string, any> {
  activated : [ SessionToken ]
  cancelled : [ SessionToken ]
  cleared   : [ void ]
  revoked   : [ SessionToken ]
  pending   : [ SessionToken ]
  updated   : [ SessionToken ]
}
