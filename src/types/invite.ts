import type { AgentProfile }     from './agent.js'
import type { BaseEventMap }     from './emitter.js'
import type { PermissionPolicy } from './request.js'

export interface InviteConfig {
  policy  : PermissionPolicy
  profile : AgentProfile
  relays  : string[]
}

export interface InviteToken {
  policy  : PermissionPolicy
  profile : AgentProfile
  pubkey  : string
  relays  : string[]
  secret  : string
}

export interface JoinEvent {
  pubkey : string
  secret : string
}

export interface InviteEventMap extends BaseEventMap {
  cancel  : [ string ]
  expired : [ string ]
  invite  : [ InviteToken ]
  join    : [ JoinEvent ]
  revoke  : [ void   ]
}