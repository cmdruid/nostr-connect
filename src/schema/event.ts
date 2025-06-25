import * as base from '@vbyte/micro-lib/schema'

const z      = base.zod
const tags   = base.str.array()

const template = z.object({
  content    : base.str,
  created_at : base.stamp,
  kind       : base.num,
  pubkey     : base.hex32,
  tags       : tags.array()
})

const unsigned = template.extend({
  id : base.hex32
})

const signed = unsigned.extend({
  sig : base.hex64,
})

export { signed, tags, template, unsigned }
