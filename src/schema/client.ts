import * as base from '@/util/schema.js'

const session = base.zod.object({
  pubkey : base.hex32,
  relays : base.str.array(),
  perms  : base.zod.map(base.str, base.any).optional(),
  name   : base.str.optional(),
  url    : base.str.optional(),
  image  : base.str.optional(),
})

const options = base.zod.object({
  debug          : base.bool,
  verbose        : base.bool,
  relays         : base.str.array(),
  sessions       : session.array(),
  req_timeout    : base.num,
  invite_timeout : base.num,
}).partial()

const config = base.zod.object({
  debug          : base.bool,
  verbose        : base.bool,
  req_timeout    : base.num,
  invite_timeout : base.num,
})

export { config, options, session }
