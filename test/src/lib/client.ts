import { Buff }   from '@vbyte/buff'
import { sha256 } from '@vbyte/micro-lib/hash'

import {
  NostrClient,
  ChannelManager,
  SessionManager,
  SimpleSigner,
  RequestManager
} from '@/index.js'

import type { ClientOptions }            from '@/types/client.js'
import type { TestProvider, TestMember } from '../types.js'

export function create_provider (
  name    : string,
  options : ClientOptions = {}
) : TestProvider {
  const seckey  = sha256(Buff.str(name)).hex
  const signer  = new SimpleSigner(seckey)
  const client  = new NostrClient(signer, options)
  const channel = new ChannelManager(client, options)
  return { client, channel }
}

export function create_member (
  name    : string,
  options : ClientOptions = {}
) : TestMember {
  const seckey  = sha256(Buff.str(name)).hex
  const signer  = new SimpleSigner(seckey)
  const client  = new NostrClient(signer, options)
  const session = new SessionManager(client, options)
  const request = new RequestManager(client, session)
  return { client, request, session, signer }
}
