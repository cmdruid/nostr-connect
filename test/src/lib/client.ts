import { Buff } from '@cmdcode/buff'

import { NostrClient, SimpleSigner } from '@/index.js'

import type { ClientOptions } from '@/types/client.js'

export function create_client (
  name    : string,
  options : ClientOptions = {}
) : NostrClient {
  const seckey = Buff.str(name).digest.hex
  const signer = new SimpleSigner(seckey)
  const pubkey = signer.get_pubkey()
  return new NostrClient(pubkey, signer, options)
}
