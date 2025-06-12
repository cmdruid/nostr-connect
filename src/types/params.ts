import type { EventTemplate } from 'nostr-tools'

export type Nip46SignEventParams = [
  event : EventTemplate
]

export type Nip46EncryptParams = [
  peer_pk   : string,
  plaintext : string
]

export type Nip46DecryptParams = [
  peer_pk    : string,
  ciphertext : string
]
