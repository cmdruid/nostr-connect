import type { PermissionPolicy } from './request.js'

export interface ChannelMember {
  pubkey     : string
  created_at : number
}

export interface HostProfile {
  name?  : string
  url?   : string
  image? : string
}

export interface ChannelManagerOptions extends Partial<ChannelConfig> {
  members? : ChannelMember[]
}

export interface ChannelConfig {
  policy  : PermissionPolicy
  profile : HostProfile
  timeout : number
}

export interface ChannelEventMap extends Record<string, any> {
  join    : [ ChannelMember ]
  leave   : [ ChannelMember ]
  invite  : [ string ]
  cancel  : [ string ]
  cleared : [ void ]
  expired : [ string ]
}
