import { Buff } from '@cmdcode/buff'

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip04,
  nip44
} from 'nostr-tools'

import type { SignerDeviceAPI } from '@/types/signer.js'

import type {
  EventTemplate,
  VerifiedEvent
} from 'nostr-tools'

const SIGN_METHODS : Record<string, string> = {
  sign_event    : 'sign_event',
  nip04_encrypt : 'nip04_encrypt',
  nip04_decrypt : 'nip04_decrypt',
  nip44_encrypt : 'nip44_encrypt',
  nip44_decrypt : 'nip44_decrypt'
}

export class SignerDevice implements SignerDeviceAPI {
  private readonly _seckey : Uint8Array

  constructor (seckey? : string | Uint8Array) {
    this._seckey = (seckey)
      ? Buff.bytes(seckey)
      : generateSecretKey()
  }

  async get_methods () : Promise<Record<string, string>> {
    return SIGN_METHODS
  }

  async get_pubkey () : Promise<string> {
    return getPublicKey(this._seckey)
  }

  async sign_event (event : EventTemplate) : Promise<VerifiedEvent> {
    return finalizeEvent(event, this._seckey)
  }

  async nip04_encrypt (pubkey : string, plaintext : string) : Promise<string> {
    return nip04.encrypt(this._seckey, pubkey, plaintext)
  }

  async nip04_decrypt (pubkey : string, ciphertext : string) : Promise<string> {
    return nip04.decrypt(this._seckey, pubkey, ciphertext)
  }

  async nip44_encrypt (pubkey : string, plaintext : string) : Promise<string> {
    const shared = nip44.getConversationKey(this._seckey, pubkey)
    return nip44.encrypt(plaintext, shared)
  }

  async nip44_decrypt (pubkey : string, ciphertext : string) : Promise<string> {
    const shared = nip44.getConversationKey(this._seckey, pubkey)
    return nip44.decrypt(ciphertext, shared)
  }
}
