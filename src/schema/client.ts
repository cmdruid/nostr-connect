import * as base from '@/util/schema.js'

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

const options = base.zod.object({
  debug           : base.bool,
  verbose         : base.bool,
  relays          : base.str.array(),
  sessions        : session.array(),
  req_timeout     : base.num,
  invite_timeout  : base.num,
  pending_timeout : base.num,
}).partial()

const config = base.zod.object({
  debug           : base.bool,
  verbose         : base.bool,
  req_timeout     : base.num,
  invite_timeout  : base.num,
  pending_timeout : base.num,
})

export { config, options, perm_map, perm_value, session }
