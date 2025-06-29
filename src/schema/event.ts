import { z }     from 'zod'
import * as base from '@vbyte/micro-lib/schema'

import type { EventTemplate, SignedEvent, UnsignedEvent } from '@/types/index.js'

export const tags = base.str.array()

export const template = z.object({
  content    : base.str,
  created_at : base.stamp,
  kind       : base.num,
  tags       : tags.array()
}) satisfies z.ZodType<EventTemplate>

export const unsigned = template.extend({
  id         : base.hex32,
  pubkey     : base.hex32
}) satisfies z.ZodType<UnsignedEvent>

export const signed = unsigned.extend({
  sig : base.hex64,
}) satisfies z.ZodType<SignedEvent>
