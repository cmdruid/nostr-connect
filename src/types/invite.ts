import type { AgentProfile }     from './agent.js'
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
