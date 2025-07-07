import { Buff }   from '@vbyte/buff'
import { sha256 } from '@vbyte/micro-lib/hash'

import {
  SignerAgent,
  SignerClient,
  SimpleSigner
} from '@/index.js'

import type {
  SignerClientOptions,
  SignerAgentOptions
} from '@/types/index.js'

export function create_agent (
  name    : string,
  options : SignerAgentOptions = {}
) {
  const seckey  = sha256(Buff.str(name)).hex
  const signer  = new SimpleSigner(seckey)
  return new SignerAgent(signer, options)
}

export function create_signer (
  name    : string,
  options : SignerClientOptions = {}
) {
  const seckey  = sha256(Buff.str(name)).hex
  const signer  = new SimpleSigner(seckey)
  return new SignerClient(signer, options)
}
