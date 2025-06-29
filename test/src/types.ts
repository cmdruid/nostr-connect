import type { Test } from 'tape'

import type {
  NostrClient,
  ChannelManager,
  SessionManager,
  RequestManager,
  SimpleSigner
} from '@/index.js'

export interface TestContext {
  provider : TestProvider
  member   : TestMember
  relays   : string[]
  tape     : Test
}

export interface TestProvider {
  client  : NostrClient
  channel : ChannelManager
}

export interface TestMember {
  client  : NostrClient
  request : RequestManager
  session : SessionManager
  signer  : SimpleSigner
}