import type { Test } from 'tape'

import type {
  SignerClient,
  SignerAgent
} from '@/index.js'

export interface TestContext {
  agent  : SignerAgent
  client : SignerClient
  relays : string[]
  tape   : Test
}
