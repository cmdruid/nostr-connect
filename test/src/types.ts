import type { NostrClient, SignServer } from '@cmdcode/nip46-sdk'

import type { Test } from 'tape'

export interface TestContext {
  client : NostrClient
  server : SignServer
  relays : string[]
  tape   : Test
}
