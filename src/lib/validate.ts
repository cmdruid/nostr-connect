import type { ClientConfig, ClientOptions } from '@/types/index.js'

import * as Schema from '@/schema/index.js'

export function verify_options (
  options : unknown
) : asserts options is ClientOptions {
  const schema = Schema.client.options
  const parsed = schema.safeParse(options)
  if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('client options failed validation')
  }
}

export function parse_config (
  options : unknown
) : ClientConfig {
  const schema = Schema.client.config
  const parsed = schema.safeParse(options)
  if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('client config failed validation')
  }
  return parsed.data
}
