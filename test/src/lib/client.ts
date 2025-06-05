import { Buff } from '@cmdcode/buff'

import { NostrClient, SimpleSigner } from '@cmdcode/nip46-sdk'

import { ClientConfig, SignServer } from '@cmdcode/nip46-sdk'

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

export async function create_server (
  name    : string,
  relays  : string[],
  options : Partial<ClientConfig> = {}
) : Promise<SignServer> {
  const client = await create_client(name, relays, options)
  return new SignServer(client)
}
