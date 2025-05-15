import type {
  RequestMessage,
  SignedMessage
} from '@/types/index.js'

export type PermissionMap = Map<string, number[]>

export type SessionEventMap = {
  'reject'   : [ reason: string, message: SignedMessage ]
  'register' : [ token: SessionToken ]
  'request'  : [ message: RequestMessage ]
}

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
