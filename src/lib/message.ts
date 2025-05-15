import { JsonUtil, now } from '@/util/index.js'

import type {
  EventConfig,
  MessageTemplate,
  SignedEvent,
  SignedMessage,
  SignDeviceAPI,
  RequestMessage,
  AcceptMessage,
  RejectMessage
} from '@/types/index.js'

import * as Schema from '@/schema/index.js'

export function create_message (
  config : Partial<MessageTemplate>
) : MessageTemplate {
  const schema = Schema.message.all
  const parsed = schema.safeParse(config)
  if (!parsed.success) throw new Error('invalid message template')
  return parsed.data
}

/**
 * Creates a signed event envelope containing encrypted message content.
 * @param config   Event configuration
 * @param content  String content to encrypt and send
 * @param peer_pk  Recipient's public key
 * @param seckey   Sender's secret key in hex format
 * @returns        Signed Nostr event containing the encrypted message
 */
export async function create_envelope (
  config    : EventConfig,
  payload   : string,
  recipient : string,
  signer    : SignDeviceAPI
) : Promise<SignedEvent> {
  // Define the created_at timestamp.
  const created_at = config.created_at ?? now()
  // Define the sender's public key.
  const pubkey   = await signer.get_pubkey()
  // Encrypt the payload.
  const content  = await signer.nip44_encrypt(recipient, payload)
  // Create an event template.
  const template = { ...config, pubkey, content, created_at }
  // Add a tag for the peer's public key.
  template.tags.push([ 'p', recipient ])
  // Sign the event.
  return signer.sign_event(template)
}

/**
 * Decrypts an encrypted event envelope and returns the decrypted payload.
 * @param event  Encrypted event string
 * @returns      Decrypted payload string
 */
export async function decrypt_envelope (
  event  : SignedEvent,
  signer : SignDeviceAPI
) : Promise<string> {
  return signer.nip44_decrypt(event.pubkey, event.content)
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
  const schema = Schema.message.all
  // Parse the event json.
  const parsed = schema.safeParse(json)
  // If the event schema is invalid, throw an error.
  if (!parsed.success) {
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
      throw new Error('invalid message type')
  }
}

function get_message_type (
  msg : Record<string, any>
) : string | null {
  if ('method' in msg) return 'request'
  if ('result' in msg) return 'accept'
  if ('error'  in msg) return 'reject'
  return null
}
