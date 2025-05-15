import type { NostrNode } from '@cmdcode/nostr-p2p'
import type { Test }      from 'tape'

export interface TestContext {
  nodes  : Map<string, NostrNode>
  relays : string[]
  tape   : Test
}
