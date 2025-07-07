import { z }     from 'zod'
import * as base from '@vbyte/micro-lib/schema'

import type { PermissionPolicy } from '@/types/index.js'

export const perm_entry = base.zod.record(base.str, base.zod.boolean())

export const policy = base.zod.object({
  methods : perm_entry,
  kinds   : perm_entry
}) satisfies z.ZodType<PermissionPolicy>
