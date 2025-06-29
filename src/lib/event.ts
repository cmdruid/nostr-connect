import { now }     from '@vbyte/micro-lib/util'
import * as Schema from '@/schema/index.js'

import type {
  SignedEvent,
  SignerDeviceAPI,
  EnvelopeConfig,
  EventTemplate
} from '@/types/index.js'

/**
 * Creates a signed event envelope containing encrypted message content.
 * @param config   Event configuration
 * @param content  String content to encrypt and send
 * @param peer_pk  Recipient's public key
 * @param seckey   Sender's secret key in hex format
 * @returns        Signed Nostr event containing the encrypted message
 */
export async function create_envelope (
  config    : EnvelopeConfig,
  payload   : string,
  recipient : string,
  signer    : SignerDeviceAPI
) : Promise<SignedEvent> {
  // Define the created_at timestamp.
  const created_at = config.created_at ?? now()
  // Define the tags.
  const tags     = config.tags ?? []
  // Encrypt the payload.
  const content  = await signer.nip44_encrypt(recipient, payload)
  // Create an event template.
  const template = { ...config, content, created_at, tags }
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
  signer : SignerDeviceAPI
) : Promise<string> {
  return event.content.includes('?iv=')
    ? signer.nip04_decrypt(event.pubkey, event.content)
    : signer.nip44_decrypt(event.pubkey, event.content)
}

export function parse_event_template (event : unknown) : EventTemplate {
  return Schema.event.template.parse(event)
}

export function parse_signed_event (event : unknown) : SignedEvent {
  return Schema.event.signed.parse(event)
}

export function validate_event_template (
  event : unknown
) : asserts event is EventTemplate {
  parse_event_template(event)
}

export function validate_signed_event (
  event : unknown
) : asserts event is SignedEvent {
  parse_signed_event(event)
}