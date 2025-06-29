import type { ChannelProfile }   from './channel.js'
import type { PermissionPolicy } from './perm.js'

export interface SessionToken {
  created_at : number
  policy     : PermissionPolicy
  profile    : ChannelProfile
  pubkey     : string
  relays     : string[]
}

export interface SessionManagerConfig {
  timeout : number
}

export interface SessionManagerOptions extends Partial<SessionManagerConfig> {
  sessions? : SessionToken[]
}
