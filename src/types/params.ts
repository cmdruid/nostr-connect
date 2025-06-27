import type { EventTemplate } from 'nostr-tools'

export type SignEventParams = [
  event : EventTemplate
]

export type EncryptParams = [
  peer_pk   : string,
  plaintext : string
]

export type DecryptParams = [
  peer_pk    : string,
  ciphertext : string
]
