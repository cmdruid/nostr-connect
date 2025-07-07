import type { PermissionPolicy } from './request.js'

export interface AgentSession {
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
  policy  : PermissionPolicy
  profile : AgentProfile
  timeout : number
}

export interface SignerAgentOptions extends Partial<SignerAgentConfig> {
  session? : AgentSession
}
