import type { AgentProfile }     from './agent.js'
import type { PermissionPolicy } from './request.js'

export interface SignerSession {
  created_at : number
  policy     : PermissionPolicy
  profile    : AgentProfile
  pubkey     : string
  relays     : string[]
}

export interface SessionManagerConfig {
  negotiate_timeout : number
}

export interface SessionManagerOptions extends Partial<SessionManagerConfig> {
  sessions? : SignerSession[]
}
