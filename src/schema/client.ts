import { z }     from 'zod'
import * as base from '@vbyte/micro-lib/schema'

import type { ClientConfig, ClientOptions } from '@/types/index.js'

export const config = base.zod.object({
  timeout : base.num,
}) satisfies z.ZodType<ClientConfig>

export const options = config.partial() satisfies z.ZodType<ClientOptions>
