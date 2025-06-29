import { z }       from 'zod'
import * as base   from '@vbyte/micro-lib/schema'
import { profile } from './channel.js'
import { policy }  from './perm.js'

import type {
  SessionManagerConfig,
  SessionManagerOptions,
  SessionToken
} from '@/types/index.js'

export const token = base.zod.object({
  created_at : base.stamp,
  policy     : policy,
  profile    : profile,
  pubkey     : base.hex32,
  relays     : base.str.array(),
}) satisfies z.ZodType<SessionToken>

export const config = base.zod.object({
  timeout : base.num,
}) satisfies z.ZodType<SessionManagerConfig>

export const options = config.extend({
  sessions : token.array(),
}).partial() satisfies z.ZodType<SessionManagerOptions>
