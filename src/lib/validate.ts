import type { SocketConfig, SocketOptions } from '@/types/index.js'

import * as Schema from '@/schema/index.js'

export function verify_socket_options (
  options : unknown
) : asserts options is SocketOptions {
  const schema = Schema.socket.options
  const parsed = schema.safeParse(options)
  if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('client options failed validation')
  }
}

export function parse_socket_config (
  options : unknown
) : SocketConfig {
  const schema = Schema.socket.config
  const parsed = schema.safeParse(options)
  if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('client config failed validation')
  }
  return parsed.data
}
