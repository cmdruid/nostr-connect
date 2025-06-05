import { EventTemplate } from 'nostr-tools'
import { SignedEvent }   from './event.js'

export type SignEventAPI = (event : EventTemplate) => Promise<SignedEvent>

export interface SignerDeviceAPI {
  get_pubkey    : () => Promise<string>
  sign_event    : SignEventAPI
  nip04_encrypt : (pubkey : string, plaintext  : string) => Promise<string>
  nip04_decrypt : (pubkey : string, ciphertext : string) => Promise<string>
  nip44_encrypt : (pubkey : string, plaintext  : string) => Promise<string>
  nip44_decrypt : (pubkey : string, ciphertext : string) => Promise<string>
}
