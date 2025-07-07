import type { PermissionPolicy } from './request.js'

export interface DeviceSession {
  created_at : number
  pubkey     : string
  secret     : string
}

export interface AgentProfile {
  name?  : string
  url?   : string
  image? : string
}

export interface SignerAgentConfig {
  host_policy    : PermissionPolicy
  host_profile   : AgentProfile
  invite_timeout : number
}

export interface SignerAgentOptions extends Partial<SignerAgentConfig> {
  device? : DeviceSession
}
