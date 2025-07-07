import { z }      from 'zod'
import * as base  from '@vbyte/micro-lib/schema'
import { policy } from './perm.js'

import type {
  SignerAgentConfig,
  AgentProfile,
  InviteToken
} from '@/types/index.js'

export const profile = base.zod.object({
  name  : base.str,
  url   : base.str,
  image : base.str,
}).partial() satisfies z.ZodType<AgentProfile>

export const token = base.zod.object({
  pubkey : base.hex32,
  relays : base.str.array(),
  policy : policy,
  profile: profile,
  secret : base.str,
}) satisfies z.ZodType<InviteToken>

export const config = base.zod.object({
  policy  : policy,
  profile : profile,
  timeout : base.num,
}) satisfies z.ZodType<SignerAgentConfig>
