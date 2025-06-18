export const DOMAIN_TAG  = 'nostr-connect'
export const REQ_TIMEOUT = 5000
export const EVENT_KIND  = 24133

export const REQ_METHOD = {
  CONNECT       : 'connect',
  PING          : 'ping',
  GET_PUBKEY    : 'get_public_key',
  CLOSE         : 'close'
}

export const SIGN_METHOD = {
  SIGN_EVENT    : 'sign_event',
  NIP04_DECRYPT : 'nip04_decrypt',
  NIP04_ENCRYPT : 'nip04_encrypt',
  NIP44_DECRYPT : 'nip44_decrypt',
  NIP44_ENCRYPT : 'nip44_encrypt'
}