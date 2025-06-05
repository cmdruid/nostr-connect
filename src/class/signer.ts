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

export class SignerDevice implements SignerDeviceAPI {
  private readonly _seckey : Uint8Array

  constructor (seckey? : string) {
    this._seckey = (seckey)
      ? Buff.hex(seckey)
      : generateSecretKey()
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