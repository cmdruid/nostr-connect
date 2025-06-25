import { now } from '@vbyte/micro-lib/util'

import type {
  SignedEvent,
  SignerDeviceAPI,
  MessageConfig
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
  config    : MessageConfig,
  payload   : string,
  recipient : string,
  signer    : SignerDeviceAPI
) : Promise<SignedEvent> {
  // Define the created_at timestamp.
  const created_at = config.created_at ?? now()
  // Define the tags.
  const tags     = config.tags ?? []
  // Define the sender's public key.
  const pubkey   = await signer.get_pubkey()
  // Encrypt the payload.
  const content  = await signer.nip44_encrypt(recipient, payload)
  // Create an event template.
  const template = { ...config, pubkey, content, created_at, tags }
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
