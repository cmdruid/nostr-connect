import { JsonUtil } from '@vbyte/micro-lib/json'

import type {
  SignedEvent,
  SignedMessage,
  RequestMessage,
  AcceptMessage,
  RejectMessage,
  RequestTemplate,
  RejectTemplate,
  AcceptTemplate
} from '@/types/index.js'

import * as Schema from '@/schema/index.js'

/**
 * Creates a request message template from a config object.
 * @param config  Message configuration
 * @returns       Message template
 */
export function create_request_template (
  config : Partial<RequestTemplate>
) : RequestTemplate {
  // Parse the message template.
  const schema = Schema.message.request_template.safeParse(config)
  // If the message template is invalid, throw an error.
  if (!schema.success) {
    console.error(schema.error)
    console.error(config)
    throw new Error('invalid request message')
  }
  // Return the message template.
  return schema.data
}

/**
 * Creates an accept message template from a config object.
 * @param config  Message configuration
 * @returns       Message template
 */
export function create_accept_template (
  config : Partial<AcceptTemplate>
) : AcceptTemplate {
  // Parse the message template.
  const schema = Schema.message.accept_template.safeParse(config)
  // If the message template is invalid, throw an error.
  if (!schema.success) {
    console.error(schema.error)
    console.error(config)
    throw new Error('invalid request message')
  }
  // Return the message template.
  return schema.data
}

/**
 * Creates a reject message template from a config object.
 * @param config  Message configuration
 * @returns       Message template
 */
export function create_reject_template (
  config : Partial<RejectTemplate>
) : RejectTemplate {
  // Parse the message template.
  const schema = Schema.message.reject_template.safeParse(config)
  // If the message template is invalid, throw an error.
  if (!schema.success) {
    console.error(schema.error)
    console.error(config)
    throw new Error('invalid request message')
  }
  // Return the message template.
  return schema.data
}

/**
 * Parses a serialized message and returns the parsed message.
 * @param content  Serialized message string
 * @returns        Parsed message
 */
export function parse_message (
  content  : string,
  envelope : SignedEvent
) : SignedMessage {
  // Parse the event json.
  const json = JsonUtil.parse(content)
  // If the message json is invalid, throw an error.
  if (!json) throw new Error('invalid message json')
  // Define the schema for a signed event.
  const schema = Schema.message.template
  // Parse the event json.
  const parsed = schema.safeParse(json)
  // If the event schema is invalid, throw an error.
  if (!parsed.success) {
    console.error(parsed.error)
    console.error(json)
    throw new Error('invalid message payload')
  }
  // Get the message type.
  const type = get_message_type(json)
  // Return the parsed message.
  switch (type) {
    case 'request':
      return { ...parsed.data, env: envelope, type } as RequestMessage
    case 'accept':
      return { ...parsed.data, env: envelope, type } as AcceptMessage
    case 'reject':
      return { ...parsed.data, env: envelope, type } as RejectMessage
    default:
      throw new Error(`invalid message type: ${type}`)
  }
}

/**
 * Gets the message type from a message object.
 * @param msg  Message object
 * @returns    Message type
 */
export function get_message_type (
  msg : Record<string, any>
) : string | null {
  if ('method' in msg) return 'request'
  if ('result' in msg) return 'accept'
  if ('error'  in msg) return 'reject'
  return null
}
