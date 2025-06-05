import * as base  from '@/util/schema.js'

const z      = base.zod
const msg_id = base.str.max(32)
const param  = base.str

const request = z.object({
  id     : msg_id,
  method : base.str,
  params : param.array().default([]),
})

const accept = z.object({
  id     : msg_id,
  result : base.str,
})

const reject = z.object({
  id    : msg_id,
  error : base.str,
})

const all      = z.union([ request, accept, reject ])
const response = z.union([ accept, reject ])

export {
  request,
  accept,
  reject,
  response,
  all
}
