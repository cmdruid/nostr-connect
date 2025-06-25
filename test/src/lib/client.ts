import { Buff }   from '@vbyte/buff'
import { sha256 } from '@vbyte/micro-lib/hash'

import { NostrClient, SimpleSigner } from '@/index.js'

import type { ClientOptions } from '@/types/client.js'

export function create_client (
  name    : string,
  options : ClientOptions = {}
) : NostrClient {
  const seckey = sha256(Buff.str(name)).hex
  const signer = new SimpleSigner(seckey)
  return new NostrClient(signer, options)
}
