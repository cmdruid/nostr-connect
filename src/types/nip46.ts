import type { EventTemplate } from 'nostr-tools'

export type Nip46Command = 'connect'       | 'sign_event'     | 
                           'ping'          | 'get_public_key' |
                           'nip04_encrypt' | 'nip04_decrypt'  |
                           'nip44_encrypt' | 'nip44_decrypt'

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
