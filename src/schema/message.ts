import { z }      from 'zod'
import * as base  from '@vbyte/micro-lib/schema'
import { signed } from './event.js'

import type {
  AcceptMessage,
  AcceptTemplate,
  MessageTemplate,
  RejectMessage,
  RejectTemplate,
  RequestMessage,
  RequestTemplate,
  SignedMessage
} from '@/types/index.js'

export const identifier = base.str.max(64)
export const param  = base.str

export const request_template = z.object({
  id     : identifier,
  method : base.str,
  params : param.array().default([]),
}) satisfies z.ZodType<RequestTemplate>

export const accept_template = z.object({
  id     : identifier,
  result : base.str,
}) satisfies z.ZodType<AcceptTemplate> 

export const reject_template = z.object({
  id    : identifier,
  error : base.str,
}) satisfies z.ZodType<RejectTemplate>

export const template = z.union([
  request_template,
  accept_template,
  reject_template,
]) satisfies z.ZodType<MessageTemplate>

export const request_message = request_template.extend({
  env  : signed,
  type : z.literal('request'),
}) satisfies z.ZodType<RequestMessage>

export const accept_message = accept_template.extend({
  env  : signed,
  type : z.literal('accept'),
}) satisfies z.ZodType<AcceptMessage>

export const reject_message = reject_template.extend({
  env  : signed,
  type : z.literal('reject'),
}) satisfies z.ZodType<RejectMessage>

export const event = z.discriminatedUnion('type', [
  request_message,
  accept_message,
  reject_message,
]) satisfies z.ZodType<SignedMessage>
