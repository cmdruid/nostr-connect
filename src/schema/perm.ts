import { z }     from 'zod'
import * as base from '@vbyte/micro-lib/schema'

import type { PermissionPolicy } from '@/types/index.js'

export const method_perms = base.zod.record(base.str, base.zod.boolean())
export const kind_perms = base.zod.record(base.num, base.zod.boolean())

export const policy = base.zod.object({
  methods : method_perms,
  kinds   : kind_perms
}) satisfies z.ZodType<PermissionPolicy>
