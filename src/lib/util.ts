import { Buff }    from '@vbyte/buff'
import { hash256 } from '@vbyte/micro-lib/hash'

import type { BaseEventMap, UnsignedEvent } from '@/types/index.js'
import { EventEmitter } from '@/class/emitter.js'

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
  template : Omit<UnsignedEvent, 'id'>
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

export function attach_logger (emitter : EventEmitter<BaseEventMap>) {
  return {
    info : (...args : any[]) => {
      emitter.emit('info', ...args)
    },
    error : (...args : any[]) => {
      emitter.emit('error', ...args)
    },
    warn : (...args : any[]) => {
      emitter.emit('warn', ...args)
    },
    debug : (...args : any[]) => {
      emitter.emit('debug', ...args)
    }
  }
}