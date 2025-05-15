import * as base  from '@/util/schema.js'
import * as event from './event.js'

const z      = base.zod
const msg_id = base.hex20
const param  = base.str

const req_template = z.object({
  id     : msg_id,
  method : base.str,
  params : param.array().default([]),
  type   : z.literal('request')
})

const res_template = z.object({
  id     : msg_id,
  result : base.str,
  type   : z.literal('response')
})

const rej_template = z.object({
  id     : msg_id,
  error  : base.str,
  type   : z.literal('reject')
})

const req_signed = req_template.extend({
  env : event.signed
})

const res_signed = res_template.extend({
  env : event.signed
})

const rej_signed = rej_template.extend({
  env : event.signed
})

const template = z.union([ req_template, res_template, rej_template ])
const signed   = z.union([ req_signed,   res_signed,   rej_signed   ])

export {
  req_template,
  res_template,
  rej_template,
  req_signed,
  res_signed,
  rej_signed,
  signed,
  template
}
