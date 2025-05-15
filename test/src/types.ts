import type { NostrClient } from '@cmdcode/nip46-sdk'
import type { Test }        from 'tape'

export interface TestContext {
  clients : {
    local  : NostrClient
    remote : NostrClient
  }
  relays : string[]
  tape   : Test
}
