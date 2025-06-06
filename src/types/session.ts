export type PermissionMap = Map<string, number[]>

export type InviteEntry = [ secret : string, token : SessionToken ]

export interface BaseToken {
  pubkey     : string
  relays     : string[]
  perms?     : PermissionMap
  name?      : string
  url?       : string
  image?     : string
}

export interface InviteToken {
  pubkey : string
  relays : string[]
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

export interface ConnectionToken extends BaseToken {
  secret : string
}

export interface SessionEventMap extends Record<string, any> {
  activated : [ SessionToken ]
  cancelled : [ SessionToken ]
  cleared   : [ void ]
  revoked   : [ SessionToken ]
  invite    : [ SessionToken ]
  pending   : [ SessionToken ]
}
