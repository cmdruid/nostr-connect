import { Buff } from '@cmdcode/buff'

import { NostrClient, SimpleSigner } from '@cmdcode/nip46-sdk'

import type { ClientConfig } from '@cmdcode/nip46-sdk'

export async function create_client (
  name    : string,
  relays  : string[],
  options : Partial<ClientConfig> = {}
) : Promise<NostrClient> {
  const seckey = Buff.str(name).digest.hex
  const signer = new SimpleSigner(seckey)
  const pubkey = await signer.get_pubkey()
  return new NostrClient(pubkey, relays, signer, options)
}
