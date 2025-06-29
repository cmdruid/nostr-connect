import * as base from '@vbyte/micro-lib/schema'

const perm_value = base.zod.union([
  base.zod.boolean(),
  base.zod.array(base.num)
])

const perm_map = base.zod.record(base.str, perm_value)

const session = base.zod.object({
  pubkey : base.hex32,
  relays : base.str.array(),
  perms  : perm_map.optional(),
  name   : base.str.optional(),
  url    : base.str.optional(),
  image  : base.str.optional(),
})

const config = base.zod.object({
  timeout : base.num,
})

const options = config.partial()

export { config, options, perm_map, perm_value, session }
