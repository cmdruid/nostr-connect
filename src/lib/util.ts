import { Buff }    from '@vbyte/buff'
import { hash256 } from '@vbyte/micro-lib/hash'

import type { EventTemplate } from '@/types/index.js'

/**
 * Generates a random 16-byte message identifier in hexadecimal format.
 * @returns A random hexadecimal string
 */
export function gen_message_id () {
  return Buff.random(16).hex
}

/**
 * Calculates a unique event ID based on the event template properties.
 * Creates a hash of the stringified array containing event details.
 * @param template  Nostr event template containing event properties
 * @returns        Hexadecimal hash string representing the event ID
 */
export function get_event_id (
  template : EventTemplate
) {
  const preimg = JSON.stringify([
    0,
    template.pubkey,
    template.created_at,
    template.kind,
    template.tags,
    template.content,
  ])
  return hash256(Buff.str(preimg)).hex
}
