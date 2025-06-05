export type PermissionMap = Map<string, number[]>

export interface SessionOptions {
  perms? : PermissionMap,
  name?  : string,
  url?   : string,
  image? : string
}

export type SessionParams = [
  pubkey : string,
  secret : string,
  perms? : PermissionMap,
  name?  : string,
  url?   : string,
  image? : string
]

export interface SessionToken {
  pubkey : string
  relays : string[]
  secret : string
  perms? : PermissionMap
  name?  : string
  url?   : string
  image? : string
}

export interface ConnectionToken extends SessionToken {
  id : string
}
