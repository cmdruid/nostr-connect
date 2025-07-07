import { z }     from 'zod'
import * as base from '@vbyte/micro-lib/schema'

import type { SocketConfig, SocketOptions } from '@/types/index.js'

export const config = base.zod.object({
  req_timeout : base.num,
  sub_timeout : base.num,
}) satisfies z.ZodType<SocketConfig>

export const options = config.partial() satisfies z.ZodType<SocketOptions>
