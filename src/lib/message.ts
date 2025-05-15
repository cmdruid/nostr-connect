import { get_event_id }  from '@/lib/util.js'
import { JsonUtil, now } from '@/util/index.js'

import type {
  EventConfig,
  MessageTemplate,
  SignedEvent,
  SignedMessage,
  SignDeviceAPI
} from '@/types/index.js'

import * as Schema from '@/schema/index.js'

export function create_message (
  config : Partial<MessageTemplate>
) : MessageTemplate {
  const schema = Schema.message.template
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
  const pubkey   = signer.pubkey
  // Encrypt the payload.
  const content  = await signer.nip44_encrypt(recipient, payload)
  // Create an event template.
  const template = { ...config, pubkey, content, created_at }
  // Add a tag for the peer's public key.
  template.tags.push([ 'p', recipient ])
  // Compute the event id.
  const id  = get_event_id(template)
  // Sign the event.
  const sig = await signer.sign_event(template)
  // Return the signed event.
  return { ...template, id, sig }
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
  const { id, sig, ...template } = event
  const recipient = template.tags.find(t => t[0] === 'p')?.at(1) as string
  if (!recipient) throw new Error('recipient not found')
  return signer.nip44_decrypt(recipient, event.content)
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
  const schema = Schema.message.signed
  // Parse the event json.
  const parsed = schema.safeParse(json)
  // If the event schema is invalid, throw an error.
  if (!parsed.success) throw new Error('invalid message payload')
  // Return the parsed message.
  return { ...parsed.data, env: envelope }
}
