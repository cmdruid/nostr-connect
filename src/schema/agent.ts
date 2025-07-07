import { z }      from 'zod'
import * as base  from '@vbyte/micro-lib/schema'
import { policy } from './perm.js'

import type {
  SignerAgentConfig,
  AgentProfile,
  DeviceSession,
  InviteToken,
  SignerAgentOptions
} from '@/types/index.js'

export const profile = base.zod.object({
  name  : base.str,
  url   : base.str,
  image : base.str,
}).partial() satisfies z.ZodType<AgentProfile>

export const invite = base.zod.object({
  pubkey : base.hex32,
  relays : base.str.array(),
  policy : policy,
  profile: profile,
  secret : base.str,
}) satisfies z.ZodType<InviteToken>

export const device = base.zod.object({
  created_at : base.stamp,
  pubkey     : base.hex32,
}) satisfies z.ZodType<DeviceSession>

export const config = base.zod.object({
  host_policy    : policy,
  host_profile   : profile,
  invite_timeout : base.num,
}) satisfies z.ZodType<SignerAgentConfig>

export const options = config.extend({
  device,
}).partial() satisfies z.ZodType<SignerAgentOptions>
