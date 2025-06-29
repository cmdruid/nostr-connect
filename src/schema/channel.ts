import { z }      from 'zod'
import * as base  from '@vbyte/micro-lib/schema'
import { policy } from './perm.js'

import type {
  ChannelManagerConfig,
  ChannelProfile,
  ChannelMember,
  InviteToken,
  ChannelManagerOptions
} from '@/types/index.js'

export const profile = base.zod.object({
  name  : base.str,
  url   : base.str,
  image : base.str,
}).partial() satisfies z.ZodType<ChannelProfile>

export const invite = base.zod.object({
  pubkey : base.hex32,
  relays : base.str.array(),
  policy : policy,
  profile: profile,
  secret : base.str,
}) satisfies z.ZodType<InviteToken>

export const member = base.zod.object({
  created_at : base.stamp,
  pubkey     : base.hex32,
}) satisfies z.ZodType<ChannelMember>

export const config = base.zod.object({
  policy  : policy,
  profile : profile,
  timeout : base.num,
}) satisfies z.ZodType<ChannelManagerConfig>

export const options = config.extend({
  members : member.array(),
}).partial() satisfies z.ZodType<ChannelManagerOptions>
