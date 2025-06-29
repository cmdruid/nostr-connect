import type { PermissionPolicy } from './perm.js'

export interface InviteToken {
  policy  : PermissionPolicy
  profile : ChannelProfile
  pubkey  : string
  relays  : string[]
  secret  : string
}

export interface ChannelMember {
  pubkey     : string
  created_at : number
}

export interface ChannelProfile {
  name?  : string
  url?   : string
  image? : string
}

export interface ChannelManagerConfig {
  policy  : PermissionPolicy
  profile : ChannelProfile
  timeout : number
}

export interface ChannelManagerOptions extends Partial<ChannelManagerConfig> {
  members? : ChannelMember[]
}
