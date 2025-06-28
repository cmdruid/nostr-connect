import type { PermissionPolicy } from './policy.js'

export interface PeerProfile {
  name?  : string
  url?   : string
  image? : string
}

export interface PeerConnection {
  pubkey     : string
  created_at : number
}

export interface PeerManagerOptions extends Partial<PeerManagerConfig> {
  peers? : PeerConnection[]
}

export interface PeerManagerConfig {
  policy   : PermissionPolicy
  profile  : PeerProfile
  relays   : string[]
  timeout  : number
}

export interface PeerEventMap extends Record<string, any> {
  cancelled : [ string ]
  confirmed : [ PeerConnection ]
  cleared   : [ void ]
  expired   : [ string ]
  invited   : [ string ]
}
