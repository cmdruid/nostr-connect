import type { NostrClient } from '@/index.js'
import type { Test }        from 'tape'

export interface TestContext {
  client : NostrClient
  signer : NostrClient
  relays : string[]
  tape   : Test
}
