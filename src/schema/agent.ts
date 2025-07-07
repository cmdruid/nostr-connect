import { z }      from 'zod'
import * as base  from '@vbyte/micro-lib/schema'
import { config } from './invite.js'

import type {
  AgentSession,
  SignerAgentOptions
} from '@/types/index.js'

export const device = base.zod.object({
  created_at : base.stamp,
  pubkey     : base.hex32,
  secret     : base.hex32
}) satisfies z.ZodType<AgentSession>

export const options = config.extend({
  device,
}).partial() satisfies z.ZodType<SignerAgentOptions>
