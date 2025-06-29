export const DOMAIN_TAG  = 'nostr-connect'
export const REQ_TIMEOUT = 5000
export const EVENT_KIND  = 24133

export const REQ_METHOD = {
  CONNECT    : 'connect',
  PING       : 'ping',
  GET_PUBKEY : 'get_public_key',
  CLOSE      : 'close'
}

export const AUTH_METHOD = {
  SIGN_EVENT    : 'sign_event',
  NIP04_DECRYPT : 'nip04_decrypt',
  NIP04_ENCRYPT : 'nip04_encrypt',
  NIP44_DECRYPT : 'nip44_decrypt',
  NIP44_ENCRYPT : 'nip44_encrypt'
}

export const DEFAULT_KIND_PERMS : Record<number, boolean> = {
  0 : true,
  1 : true,
  4 : true
}

export const DEFAULT_METHOD_PERMS : Record<string, boolean> = {
  [AUTH_METHOD.SIGN_EVENT]    : true,
  [AUTH_METHOD.NIP04_ENCRYPT] : true,
  [AUTH_METHOD.NIP04_DECRYPT] : true,
  [AUTH_METHOD.NIP44_ENCRYPT] : true,
  [AUTH_METHOD.NIP44_DECRYPT] : true
}